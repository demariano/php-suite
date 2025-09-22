#!/bin/bash

# Create S3 bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://nx-template2-dev-data --region eu-west-2

# Set bucket policy to allow public access (for testing purposes)
aws --endpoint-url=http://localhost:4566 s3api put-bucket-policy \
    --bucket nx-template2-dev-data \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::nx-template2-dev-data/*"
            }
        ]
    }' 

# Set cors configuration
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket nx-template2-dev-data --cors-configuration file://cors-config.json