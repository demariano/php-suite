

terraform apply -var-file="terraform.tfvars" -var="use_local_profile=true" 

terraform destroy -var-file="terraform.tfvars" -var="use_local_profile=true"


for LOCAL MACHINE RUN: 
 Make sure to have a valid AWS KEY , SECRET AND TOKEN Values on the aws credential files of your machine
 export AWS_PROFILE=nx-template-dev