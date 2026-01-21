#!/bin/bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name ACCOUNTING_EVENT_SQS
