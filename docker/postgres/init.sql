-- Enable pgvector extension (runs once on container first start)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create the Langfuse specific DB
CREATE DATABASE IF NOT EXISTS langfuse_data;
