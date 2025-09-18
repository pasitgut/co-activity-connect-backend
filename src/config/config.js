require('dotenv').config()

module.exports = {
    port: process.env.PORT || 3000,
    postgresqlURI: process.env.POSTGRESQLURI,
    jwtSecret: process.env.JWT_SECRET
}