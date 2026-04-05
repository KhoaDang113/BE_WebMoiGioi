FROM node:22 AS builder

WORKDIR /app

# Copy package.json and lock-file
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript and Prisma)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN DATABASE_URL="mysql://root:password@localhost:3306/dummy" npx prisma generate

# Build the TypeScript project
RUN npm run build

# Production stage
FROM node:22-bookworm-slim

WORKDIR /app

# Set node environment to production
ENV NODE_ENV=production

# Copy package.json and lock-file
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma Client from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built code from the builder stage
COPY --from=builder /app/dist ./dist

# Need to copy schema for Prisma (optional but good practice for migrations)
COPY prisma ./prisma

# Expose port (default for Node.js apps is often 8080, adjust if you use a different one)
EXPOSE 3000

# Run the application
CMD ["npm", "start"]
