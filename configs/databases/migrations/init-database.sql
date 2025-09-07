-- PostgreSQL Database Initialization Script
-- BMAD Studio Template - Initial Schema Setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create database users
CREATE ROLE bmad_app_user WITH LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
CREATE ROLE bmad_readonly WITH LOGIN PASSWORD '${POSTGRES_READONLY_PASSWORD}';
CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD '${POSTGRES_REPLICATION_PASSWORD}';

-- Create schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Grant permissions
GRANT USAGE ON SCHEMA app TO bmad_app_user;
GRANT CREATE ON SCHEMA app TO bmad_app_user;
GRANT USAGE ON SCHEMA audit TO bmad_app_user;
GRANT SELECT ON SCHEMA audit TO bmad_readonly;
GRANT USAGE ON SCHEMA monitoring TO bmad_readonly;

-- Create audit table for tracking changes
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id TEXT
);

-- Create index on audit table
CREATE INDEX idx_audit_log_table_name ON audit.audit_log(table_name);
CREATE INDEX idx_audit_log_timestamp ON audit.audit_log(timestamp);
CREATE INDEX idx_audit_log_user_name ON audit.audit_log(user_name);

-- Create monitoring schema tables
CREATE TABLE monitoring.database_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags JSONB
);

CREATE INDEX idx_database_metrics_timestamp ON monitoring.database_metrics(timestamp);
CREATE INDEX idx_database_metrics_name ON monitoring.database_metrics(metric_name);

-- Create application tables (basic structure)
CREATE TABLE app.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE app.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes
CREATE INDEX idx_users_email ON app.users(email);
CREATE INDEX idx_users_role ON app.users(role);
CREATE INDEX idx_users_is_active ON app.users(is_active);
CREATE INDEX idx_users_created_at ON app.users(created_at);

CREATE INDEX idx_sessions_user_id ON app.sessions(user_id);
CREATE INDEX idx_sessions_token ON app.sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON app.sessions(expires_at);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_log (
            table_name, operation, old_values, user_name, session_id
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_user, 
            current_setting('application.session_id', true)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_log (
            table_name, operation, old_values, new_values, user_name, session_id
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user,
            current_setting('application.session_id', true)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_log (
            table_name, operation, new_values, user_name, session_id
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_user,
            current_setting('application.session_id', true)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app.users
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_sessions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app.sessions
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON app.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for cleaning expired sessions
CREATE OR REPLACE FUNCTION app.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM app.sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO monitoring.database_metrics (metric_name, metric_value, tags)
    VALUES ('expired_sessions_cleaned', deleted_count, '{"source": "cleanup_function"}'::jsonb);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO bmad_app_user;
GRANT INSERT ON ALL TABLES IN SCHEMA audit TO bmad_app_user;
GRANT INSERT ON ALL TABLES IN SCHEMA monitoring TO bmad_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO bmad_app_user;

GRANT SELECT ON ALL TABLES IN SCHEMA app TO bmad_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO bmad_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO bmad_readonly;

-- Create initial admin user (password should be changed after first login)
INSERT INTO app.users (email, password_hash, first_name, last_name, role)
VALUES (
    'admin@bmadstudio.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7RKCF0oQTe', -- 'admin123' - CHANGE THIS
    'Admin',
    'User',
    'admin'
);

-- Create maintenance view for monitoring
CREATE VIEW monitoring.database_health AS
SELECT 
    'connections' as metric,
    COUNT(*) as value,
    NOW() as timestamp
FROM pg_stat_activity
WHERE state = 'active'
UNION ALL
SELECT 
    'database_size' as metric,
    pg_database_size(current_database()) as value,
    NOW() as timestamp
UNION ALL
SELECT 
    'active_users' as metric,
    COUNT(*) as value,
    NOW() as timestamp
FROM app.users 
WHERE is_active = true;

GRANT SELECT ON monitoring.database_health TO bmad_readonly;

-- Insert initial metrics
INSERT INTO monitoring.database_metrics (metric_name, metric_value, tags)
VALUES 
    ('database_initialized', 1, '{"version": "1.0.0", "timestamp": "' || NOW() || '"}'::jsonb),
    ('schema_version', 1, '{"component": "initial_setup"}'::jsonb);

-- Create notification for successful initialization
NOTIFY database_initialized, 'BMAD Studio database successfully initialized';