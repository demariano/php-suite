module "sms_uuid" {
  source = "../modules/random_uuid"
}

module "sms_iam_role" {
  source      = "../modules/aws_iam_role_condition"
  service     = "cognito-idp.amazonaws.com"
  role_name   = "${var.project}-${var.environment}-sms-role"
  external_id = module.sms_uuid.uuid

}

# create the sms policy for the IAM role
data "aws_iam_policy_document" "sms_policy" {
  statement {
    effect = "Allow"
    actions = [
      "sns:publish"
    ]
    resources = ["*"]
  }
}

module "sms_policy" {
  source          = "../modules/aws_iam_policy"
  role_name       = "${var.project}-${var.environment}-sms-policy-access"
  policy_document = data.aws_iam_policy_document.sms_policy.json
}

module "sms_policy_attachment" {
  source     = "../modules/aws_iam_role_policy_attachment"
  role_name  = "${var.project}-${var.environment}-sms-role"
  policy_arn = module.sms_policy.policy_arn
}