-- Development seed data only. Supabase's CLI runs this automatically on
-- `supabase db reset` for local development; it is NOT applied by
-- `supabase db push` and must never be treated as production data.
--
-- Fixed UUIDs + ON CONFLICT DO NOTHING keep this idempotent across repeated
-- local resets. owner_id/created_by are left NULL since no real auth.users
-- rows exist until someone signs up locally — seed jobs and companies are
-- publicly visible demo content, not owned by any test account.

-- ── Categories ──────────────────────────────────────────────────────────
INSERT INTO public.job_categories (id, name, slug, icon_key) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Software Development', 'software-development', 'Code2'),
  ('10000000-0000-0000-0000-000000000002', 'Design', 'design', 'PenTool'),
  ('10000000-0000-0000-0000-000000000003', 'Marketing', 'marketing', 'Megaphone'),
  ('10000000-0000-0000-0000-000000000004', 'Finance', 'finance', 'LineChart'),
  ('10000000-0000-0000-0000-000000000005', 'Sales', 'sales', 'Handshake'),
  ('10000000-0000-0000-0000-000000000006', 'Data & Analytics', 'data-analytics', 'BarChart3'),
  ('10000000-0000-0000-0000-000000000007', 'Human Resources', 'human-resources', 'Users'),
  ('10000000-0000-0000-0000-000000000008', 'Customer Support', 'customer-support', 'Headphones'),
  ('10000000-0000-0000-0000-000000000009', 'Product', 'product', 'Boxes')
ON CONFLICT (id) DO NOTHING;

-- ── Companies ───────────────────────────────────────────────────────────
INSERT INTO public.companies (id, name, slug, industry, location, employee_count, website, description, status, founded_year, verified) VALUES
  ('20000000-0000-0000-0000-000000000001', 'NovaTech', 'novatech', 'Software & Cloud', 'Berlin, Germany', '500-1,000', 'www.novatech.example',
    'NovaTech builds developer infrastructure used by engineering teams to ship reliable products faster.', 'active', 2014, true),
  ('20000000-0000-0000-0000-000000000002', 'Vertex Labs', 'vertex-labs', 'Data & Analytics', 'Austin, United States', '200-500', 'www.vertexlabs.example',
    'Vertex Labs helps organisations turn raw operational data into decisions with a modern analytics workspace.', 'active', 2017, true),
  ('20000000-0000-0000-0000-000000000003', 'CloudSphere', 'cloudsphere', 'Cloud Infrastructure', 'Dublin, Ireland', '1,000-5,000', 'www.cloudsphere.example',
    'CloudSphere provides managed cloud infrastructure and security tooling for regulated industries.', 'active', 2011, true),
  ('20000000-0000-0000-0000-000000000004', 'BrightWorks', 'brightworks', 'Design & Product Studio', 'Toronto, Canada', '50-200', 'www.brightworks.example',
    'BrightWorks is a product studio partnering with founders and enterprises to design and launch digital products.', 'active', 2019, false),
  ('20000000-0000-0000-0000-000000000005', 'Nexora', 'nexora', 'Fintech', 'Singapore', '200-500', 'www.nexora.example',
    'Nexora builds payment and treasury products for growing businesses across Asia Pacific.', 'active', 2018, false)
ON CONFLICT (id) DO NOTHING;

-- ── Jobs ────────────────────────────────────────────────────────────────
-- A deliberate mix of statuses so every jobs-system UI state has sample
-- data: published (public listing), draft and closed (employer-only).
INSERT INTO public.jobs (
  id, company_id, category_id, title, slug, description, responsibilities, requirements,
  qualifications, benefits, employment_type, workplace_type, experience_level, city, country,
  salary_min, salary_max, salary_currency, skills, status, featured, published_at
) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
    'Senior React Developer', 'senior-react-developer',
    'Join the platform experience team building the interfaces thousands of engineers use every day.',
    ARRAY['Design and build core product surfaces in React and TypeScript', 'Lead front-end architecture decisions across two delivery squads', 'Mentor mid-level engineers through review and pairing'],
    ARRAY['5+ years building production React applications', 'Deep knowledge of TypeScript and state management', 'Comfortable working in a distributed, async-first team'],
    ARRAY['Bachelor''s degree in Computer Science or equivalent experience'],
    ARRAY['Hybrid working with two office days per week', 'Annual learning budget of €2,000', '30 days paid leave plus public holidays'],
    'Full-time', 'Hybrid', 'Senior', 'Berlin', 'Germany',
    85000, 110000, 'EUR', ARRAY['React', 'TypeScript', 'GraphQL', 'Testing'], 'published', true, now() - interval '2 days'),

  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
    'Full Stack Developer', 'full-stack-developer',
    'Build and operate services that keep regulated workloads running securely in the cloud.',
    ARRAY['Ship features across Node.js services and React front ends', 'Improve deployment pipelines and service observability'],
    ARRAY['3+ years of full stack experience with JavaScript or TypeScript', 'Working knowledge of relational databases and API design'],
    ARRAY['Experience with a major cloud provider preferred'],
    ARRAY['Fully remote within the EU', 'Home office setup allowance', 'Private healthcare and life assurance'],
    'Full-time', 'Remote', 'Mid', 'Dublin', 'Ireland',
    70000, 95000, 'EUR', ARRAY['Node.js', 'React', 'PostgreSQL', 'AWS'], 'published', true, now() - interval '4 days'),

  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
    'UI/UX Designer', 'ui-ux-designer',
    'Shape digital products from first sketch to launch alongside a small, craft-driven studio team.',
    ARRAY['Lead end-to-end design for client engagements', 'Run discovery workshops and usability sessions'],
    ARRAY['3+ years designing digital products', 'A portfolio showing strong interaction and visual craft'],
    ARRAY['Comfort with research methods and evidence-led decisions'],
    ARRAY['Flexible hybrid schedule', 'Conference and workshop budget', 'Profit-sharing programme'],
    'Full-time', 'Hybrid', 'Mid', 'Toronto', 'Canada',
    78000, 98000, 'CAD', ARRAY['Figma', 'Prototyping', 'Design Systems', 'User Research'], 'published', true, now() - interval '1 day'),

  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006',
    'Data Analyst', 'data-analyst',
    'Turn product and commercial data into insight that shapes decisions across the company.',
    ARRAY['Build dashboards and self-serve reporting', 'Partner with teams to define meaningful metrics'],
    ARRAY['1+ year of analytics experience or a strong portfolio', 'Confident SQL and spreadsheet skills'],
    ARRAY['Bachelor''s degree in a quantitative field preferred'],
    ARRAY['Remote-first within the US', 'Mentorship and structured onboarding', 'Learning stipend'],
    'Full-time', 'Remote', 'Entry', 'Austin', 'United States',
    75000, 95000, 'USD', ARRAY['SQL', 'Python', 'Dashboards', 'Statistics'], 'published', false, now() - interval '8 days'),

  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004',
    'Financial Analyst', 'financial-analyst',
    'Support planning and reporting for a licensed payments business operating across nine markets.',
    ARRAY['Build and maintain financial models and forecasts', 'Prepare monthly management reporting packs'],
    ARRAY['3+ years in financial planning or analysis', 'Advanced spreadsheet modelling skills'],
    ARRAY['Professional qualification in progress or completed'],
    ARRAY['Annual bonus scheme', 'Study support for professional qualifications', 'Health and dental insurance'],
    'Full-time', 'On-site', 'Mid', 'Singapore', 'Singapore',
    70000, 90000, 'SGD', ARRAY['Financial Modelling', 'Excel', 'Reporting', 'Forecasting'], 'closed', false, now() - interval '30 days'),

  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
    'DevOps Engineer (Draft)', 'devops-engineer-draft',
    'A twelve-month contract leading platform reliability work across multi-region Kubernetes infrastructure.',
    ARRAY['Own infrastructure as code across environments'],
    ARRAY['Deep Kubernetes and Terraform experience'],
    ARRAY[]::text[],
    ARRAY['Competitive day rate', 'Fully remote'],
    'Contract', 'Remote', 'Lead', 'Berlin', 'Germany',
    90000, 120000, 'EUR', ARRAY['Kubernetes', 'Terraform', 'CI/CD'], 'draft', false, NULL)
ON CONFLICT (id) DO NOTHING;
