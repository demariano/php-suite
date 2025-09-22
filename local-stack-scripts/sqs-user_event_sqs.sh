#!/bin/bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name USER_EVENT_SQS --region eu-west-2
