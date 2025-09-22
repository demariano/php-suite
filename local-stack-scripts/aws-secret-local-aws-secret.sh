aws --endpoint-url=http://localhost:4566 secretsmanager create-secret \
    --name local-aws-secret \
    --secret-string '{"WEB_APP_API_KEY":"test","value2":"value2"}' \
    --region eu-west-2
