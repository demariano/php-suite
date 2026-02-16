#!/bin/bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name REPORT_EVENT_SQS
