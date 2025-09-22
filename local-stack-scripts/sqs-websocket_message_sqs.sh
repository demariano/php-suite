#!/bin/bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name WEBSOCKET_MESSAGE_SQS --region eu-west-2
