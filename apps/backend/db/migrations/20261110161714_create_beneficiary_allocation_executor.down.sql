-- Migration: 20261110161714_create_beneficiary_allocation_executor
-- Created at: 2026-11-10T16:17:14.143Z

-- Reverse dependency order: allocation references executor and beneficiary.
DROP TABLE residuary_allocation;

DROP TABLE allocation;

DROP TABLE executor;

DROP TABLE beneficiary;
