#!/bin/bash

# Create S3 bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://report-data --region eu-west-2

# Set bucket policy to allow public access (for testing purposes)
aws --endpoint-url=http://localhost:4566 s3api put-bucket-policy \
    --bucket report-data \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject", "s3:PutObject"],
                "Resource": "arn:aws:s3:::report-data/*"
            }
        ]
    }' 

# Set cors configuration
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket report-data --cors-configuration file://cors-config.json