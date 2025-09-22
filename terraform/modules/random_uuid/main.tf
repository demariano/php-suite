resource "random_uuid" "uuid" {}

output "uuid" {
  value = random_uuid.uuid.result
}