provider "aws" {
  region = "us-west-2"
}

# 1. DynamoDB Table for State Tracking & Deduplication
resource "aws_dynamodb_table" "job_tracker" {
  name         = "seattle_job_tracker"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "job_id"

  attribute {
    name = "job_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

# 2. IAM Role & Permissions
resource "aws_iam_role" "lambda_exec_role" {
  name = "seattle_job_scraper_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_policy" "lambda_policy" {
  name = "seattle_job_scraper_policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
        Effect   = "Allow"
        Resource = aws_dynamodb_table.job_tracker.arn
      },
      {
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_policy" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# 3. AWS Lambda Function
resource "aws_lambda_function" "job_scraper" {
  filename      = "lambda_function.zip"
  function_name = "seattle_job_scraper"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 60
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.job_tracker.name
      DISCORD_WEBHOOK_URL = var.discord_webhook_url
    }
  }
}

# Variable for optional Discord Webhook URL
variable "discord_webhook_url" {
  type        = string
  default     = ""
  description = "Discord Webhook URL for posting job notifications"
}

# 4. EventBridge Schedule (8 AM - 10 PM PST Every 5 Mins)
resource "aws_cloudwatch_event_rule" "cron_trigger" {
  name                = "seattle_job_scraper_5min_cron"
  schedule_expression = "cron(0/5 15-5 * * ? *)"
}

resource "aws_cloudwatch_event_target" "trigger_lambda" {
  rule      = aws_cloudwatch_event_rule.cron_trigger.name
  target_id = "TargetLambda"
  arn       = aws_lambda_function.job_scraper.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.job_scraper.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron_trigger.arn
}
