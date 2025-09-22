import { NextRequest, NextResponse } from 'next/server';
import { addClient, broadcastMessage, removeClient } from './utils';

// Disable static generation
export const dynamic = 'force-dynamic';

// Store messages in memory (consider using a more persistent solution for production)
const messages: string[] = [];

export async function GET() {
    const stream = new ReadableStream({
        start(controller) {
            // Send all stored messages to the new client
            messages.forEach(message => {
                controller.enqueue(`data: ${message}\n\n`);
            });

            addClient(controller);

            return () => {
                removeClient(controller);
            };
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function POST(request: NextRequest) {
    const data = await request.json();
    const message = JSON.stringify(data);

    // Store the message
    messages.push(message);

    // Broadcast the received message to all connected clients
    broadcastMessage(message);

    return NextResponse.json({ success: true });
}