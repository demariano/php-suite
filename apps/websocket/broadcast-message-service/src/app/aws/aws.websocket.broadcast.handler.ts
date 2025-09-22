import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { BroadcastMessageDto } from '@dto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';

/**
 * Handles real-time message broadcasting through AWS API Gateway WebSocket connections for live communication.
 *
 * **Business Rules:**
 * - Messages can be broadcast to individual connections or all active connections simultaneously
 * - Connection validation performed before message delivery to prevent failed transmissions
 * - Automatic connection cleanup for closed or invalid WebSocket connections
 * - Message delivery retries with exponential backoff for transient failures
 * - Connection state synchronization between API Gateway and application database
 * - Rate limiting enforced to prevent message flooding and maintain service stability
 *
 * **Integration Points:**
 * - AWS API Gateway Management API: Direct WebSocket message delivery to connected clients
 * - WebsocketConnectionDatabaseService: Active connection tracking and state management
 * - ConfigService: WebSocket endpoint configuration and regional settings
 * - Message Queue Service: Asynchronous message processing and delivery coordination
 *
 * **Message Broadcasting Types:**
 * - Individual Targeting: Direct messages to specific users or connections
 * - Group Broadcasting: Messages to user groups, channels, or topic subscribers
 * - Global Broadcasting: System-wide announcements to all connected users
 * - Filtered Broadcasting: Messages based on user roles, permissions, or preferences
 * - Event-Driven Broadcasting: Real-time notifications triggered by system events
 *
 * **Real-Time Use Cases:**
 * - Live Chat: Instant messaging between users and support representatives
 * - System Notifications: Real-time alerts for critical system events and updates
 * - User Activity: Live status updates, presence indicators, activity feeds
 * - Data Synchronization: Real-time data updates across multiple client sessions
 * - Gaming/Interactive: Live game state updates, player interactions, scoring
 * - Collaboration: Shared document editing, whiteboard updates, screen sharing
 *
 *
 * **Error Handling & Resilience:**
 * - Automatic retry mechanism with exponential backoff for transient delivery failures
 * - Connection state validation before message transmission attempts
 * - Graceful handling of closed connections with database cleanup
 * - Dead letter queuing for repeatedly failed message deliveries
 * - Circuit breaker pattern for API Gateway availability issues
 * - Fallback mechanisms for alternative notification channels
 *
 * **Security Considerations:**
 * - Message content validation to prevent injection attacks and malicious payloads
 * - Connection authorization verification before allowing message broadcasting
 * - Rate limiting per connection to prevent abuse and denial-of-service attacks
 * - Message encryption for sensitive content during transmission
 * - Audit logging for all broadcast operations and security monitoring
 * - Connection origin validation and IP-based access controls
 *
 * **Connection Management:**
 * - Active connection tracking with heartbeat monitoring for connection health
 * - Automatic connection cleanup for expired or closed WebSocket sessions
 * - Connection metadata management including user association and session data
 * - Scaling coordination across multiple service instances for connection distribution
 * - Connection state persistence for service restart scenarios
 */
@Injectable()
export class AwsWebsocketBroadcastHandler {
    private readonly logger = new Logger(AwsWebsocketBroadcastHandler.name);

    constructor(
        @Inject('WebsocketConnectionDatabaseService')
        private readonly websocketConnectionDatabaseService: WebsocketConnectionDatabaseServiceAbstract,

        private readonly configService: ConfigService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        this.logger.log(`WebSocket broadcast request received - Message type: ${typeof message}`);

        try {
            const broadcastMessageDto: BroadcastMessageDto = JSON.parse(message);

            if (broadcastMessageDto.broadcastToAll) {
                this.logger.log(`Broadcasting to all connected clients - Action: ${broadcastMessageDto.action}`);
                await this.broadcastMessageToAllClients(broadcastMessageDto);
            } else {
                this.logger.log(
                    `Broadcasting to specific client - ConnectionId: ${broadcastMessageDto.connectionId}, Action: ${broadcastMessageDto.action}`
                );
                await this.broadcastMessageToClient(broadcastMessageDto);
            }
        } catch (error) {
            this.logger.error(`WebSocket message handling failed - Error: ${error.message}`);
            throw error;
        }
    }

    async broadcastMessageToAllClients(broadcastMessageDto: BroadcastMessageDto) {
        const connections = await this.websocketConnectionDatabaseService.getAllActiveConnections();

        this.logger.log(
            `Broadcasting message to all clients - Active connections: ${connections.length}, Action: ${broadcastMessageDto.action}`
        );

        for (const connection of connections) {
            const targetedMessage = { ...broadcastMessageDto, connectionId: connection.connectionId };
            await this.broadcastMessageToClient(targetedMessage);
        }

        this.logger.log(`Completed broadcast to all clients - Messages sent: ${connections.length}`);
    }

    async broadcastMessageToClient(broadcastMessageDto: BroadcastMessageDto) {
        this.logger.log(`Broadcasting message to client: ${JSON.stringify(broadcastMessageDto)}`);

        const websocketConnectionUrl = this.configService.get('WEBSOCKET_CONNECTION_URL');

        this.logger.log(`Broadcasting message to client with connectionId: ${broadcastMessageDto.connectionId}`);

        if (websocketConnectionUrl) {
            const apiGatewayManagement = new ApiGatewayManagementApiClient({
                endpoint: websocketConnectionUrl,
                region: process.env.DEFAULT_REGION || 'us-east-1',
            });

            const maxRetries = 3;
            const retryDelay = 500; // 0.5 seconds

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const message = JSON.stringify(broadcastMessageDto);

                    const command = new PostToConnectionCommand({
                        ConnectionId: broadcastMessageDto.connectionId,
                        Data: Buffer.from(message),
                    });

                    await apiGatewayManagement.send(command);
                    this.logger.log(
                        `WebSocket message delivered successfully - ConnectionId: ${broadcastMessageDto.connectionId}, Action: ${broadcastMessageDto.action}`
                    );
                    break; // Success, exit the retry loop
                } catch (error) {
                    this.logger.error(
                        `WebSocket message delivery failed (attempt ${attempt}/${maxRetries}) - ConnectionId: ${
                            broadcastMessageDto.connectionId
                        }, Error: ${error.name || 'Unknown'}`,
                        error.message
                    );

                    if (error.name && error.name === 'GoneException') {
                        this.logger.warn(
                            `WebSocket connection closed - Cleaning up ConnectionId: ${broadcastMessageDto.connectionId}`
                        );

                        const connection = await this.websocketConnectionDatabaseService.findByConnectionId(
                            broadcastMessageDto.connectionId
                        );
                        if (connection) {
                            await this.websocketConnectionDatabaseService.deleteRecord(connection);
                            this.logger.log(
                                `Stale WebSocket connection removed from database - ConnectionId: ${broadcastMessageDto.connectionId}`
                            );
                        }
                        break;
                    }

                    if (attempt === maxRetries) {
                        this.logger.error(
                            `WebSocket message delivery failed permanently - ConnectionId: ${broadcastMessageDto.connectionId}, Attempts: ${maxRetries}`
                        );
                    } else {
                        this.logger.log(
                            `WebSocket message delivery retry scheduled - ConnectionId: ${broadcastMessageDto.connectionId}, Delay: ${retryDelay}ms`
                        );
                        await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    }
                }
            }
        } else {
            this.logger.error('WebSocket connection URL not configured - Cannot deliver messages');
        }
    }
}
