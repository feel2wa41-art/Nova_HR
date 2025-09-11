-- Check for records with missing tenant_id
SELECT 'attendance' as table_name, COUNT(*) as missing_tenant_count 
FROM attendance WHERE tenant_id IS NULL
UNION ALL
SELECT 'leave_request' as table_name, COUNT(*) as missing_tenant_count 
FROM leave_request WHERE tenant_id IS NULL
UNION ALL
SELECT 'approval_draft' as table_name, COUNT(*) as missing_tenant_count 
FROM approval_draft WHERE tenant_id IS NULL
UNION ALL
SELECT 'attitude_session' as table_name, COUNT(*) as missing_tenant_count 
FROM attitude_session WHERE tenant_id IS NULL;

-- Get the current tenant ID for reference
SELECT id as tenant_id, name as tenant_name FROM tenant LIMIT 1;