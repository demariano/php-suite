#!/bin/bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name INVENTORY_EVENT_SQS
