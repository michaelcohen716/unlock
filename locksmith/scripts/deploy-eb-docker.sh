cd locksmith

eb init ${APPLICATION} -p docker --region us-east-1

if eb status ${ENVIRONMENT}; then
    eb deploy ${ENVIRONMENT}
else
    eb create ${ENVIRONMENT} --envvars DB_USERNAME=${DB_USERNAME},DB_PASSWORD=${DB_PASSWORD},DB_NAME=${DB_NAME},DB_HOSTNAME=${DB_HOSTNAME},NODE_ENV=${NODE_ENV} --elb-type classic
fi