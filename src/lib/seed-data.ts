import { supabase } from './supabase';
import { logSecurityEvent } from './security-log';

/**
 * Seeds demo data for a new user after signup.
 * All credentials use clearly fake placeholder values.
 */
export async function seedDemoData(userId: string): Promise<void> {
  try {
    // Create projects
    const projects = [
      { name: 'Aaditium Trades', description: 'Trading platform project', color: '#3b82f6' },
      { name: 'Dermadent', description: 'Dental care product', color: '#22c55e' },
      { name: 'Web Development', description: 'General web dev projects', color: '#f59e0b' },
    ];

    const createdProjects: { id: string; name: string }[] = [];
    for (const p of projects) {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...p, user_id: userId })
        .select('id, name')
        .single();
      if (!error && data) createdProjects.push(data);
    }

    // Create services
    const services = [
      { name: 'GitHub', icon: 'github', color: '#1f2937', website_url: 'https://github.com', is_custom: false },
      { name: 'Netlify', icon: 'netlify', color: '#00c7b7', website_url: 'https://netlify.com', is_custom: false },
      { name: 'Supabase', icon: 'supabase', color: '#3ecf8e', website_url: 'https://supabase.com', is_custom: false },
      { name: 'AWS', icon: 'aws', color: '#ff9900', website_url: 'https://aws.amazon.com', is_custom: false },
      { name: 'Bolt', icon: 'bolt', color: '#3b82f6', website_url: 'https://bolt.new', is_custom: false },
      { name: 'Gmail', icon: 'gmail', color: '#ea4335', website_url: 'https://gmail.com', is_custom: false },
    ];

    const createdServices: { id: string; name: string }[] = [];
    for (const s of services) {
      const { data, error } = await supabase
        .from('services')
        .insert({ ...s, user_id: userId })
        .select('id, name')
        .single();
      if (!error && data) createdServices.push(data);
    }

    const getServiceId = (name: string) => createdServices.find((s) => s.name === name)?.id;
    const getProjectId = (name: string) => createdProjects.find((p) => p.name === name)?.id;

    // Create credentials for Aaditium Trades
    const aaditiumId = getProjectId('Aaditium Trades');
    if (aaditiumId) {
      for (const svcName of ['GitHub', 'Netlify', 'Supabase', 'AWS', 'Bolt', 'Gmail']) {
        const svcId = getServiceId(svcName);
        if (!svcId) continue;
        const { data: cred } = await supabase
          .from('credentials')
          .insert({
            title: `${svcName} — Aaditium Trades`,
            project_id: aaditiumId,
            service_id: svcId,
            is_sensitive: true,
            user_id: userId,
          })
          .select('id')
          .single();
        if (cred) {
          await seedCredentialFields(cred.id, userId, svcName);
        }
      }
    }

    // Create credentials for Dermadent
    const dermadentId = getProjectId('Dermadent');
    if (dermadentId) {
      for (const svcName of ['GitHub', 'Netlify', 'Supabase']) {
        const svcId = getServiceId(svcName);
        if (!svcId) continue;
        const { data: cred } = await supabase
          .from('credentials')
          .insert({
            title: `${svcName} — Dermadent`,
            project_id: dermadentId,
            service_id: svcId,
            is_sensitive: true,
            user_id: userId,
          })
          .select('id')
          .single();
        if (cred) {
          await seedCredentialFields(cred.id, userId, svcName);
        }
      }
    }

    // Create credentials for Web Development
    const webDevId = getProjectId('Web Development');
    if (webDevId) {
      for (const svcName of ['GitHub', 'Netlify', 'AWS', 'Gmail']) {
        const svcId = getServiceId(svcName);
        if (!svcId) continue;
        const { data: cred } = await supabase
          .from('credentials')
          .insert({
            title: `${svcName} — Web Development`,
            project_id: webDevId,
            service_id: svcId,
            is_sensitive: true,
            user_id: userId,
          })
          .select('id')
          .single();
        if (cred) {
          await seedCredentialFields(cred.id, userId, svcName);
        }
      }
    }

    // Create some notes
    if (aaditiumId) {
      await supabase.from('notes').insert({
        title: 'AWS Deployment Notes',
        content: 'Server: ec2-xxx-xxx-xxx\nSSH command: ssh -i key.pem ubuntu@xxx\nDeployment process: Push to main branch, Netlify auto-deploys.',
        project_id: aaditiumId,
        is_sensitive: false,
        user_id: userId,
      });

      await supabase.from('notes').insert({
        title: 'Supabase Migration Notes',
        content: 'Run migrations via the SQL editor. Always backup before schema changes.\nProduction URL: https://xxx.supabase.co',
        project_id: aaditiumId,
        is_sensitive: true,
        user_id: userId,
      });
    }

    logSecurityEvent(userId, 'record_created', 'Seeded demo data');
  } catch (err) {
    console.error('Seed failed:', err);
  }
}

async function seedCredentialFields(credId: string, userId: string, serviceName: string) {
  const fields: { field_name: string; field_value: string; field_type: string; is_sensitive: boolean }[] = [];

  switch (serviceName) {
    case 'GitHub':
      fields.push(
        { field_name: 'Email', field_value: 'amol@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Username', field_value: 'amol-mohite', field_type: 'text', is_sensitive: false },
        { field_name: 'Password', field_value: 'fakepassword123!', field_type: 'password', is_sensitive: true },
        { field_name: 'Repository URL', field_value: 'https://github.com/amol-mohite/aditium-trades', field_type: 'url', is_sensitive: false },
        { field_name: 'Personal Access Token', field_value: 'ghp_fakeTokenExample123', field_type: 'secret', is_sensitive: true },
      );
      break;
    case 'Netlify':
      fields.push(
        { field_name: 'Email', field_value: 'amol@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Password', field_value: 'fakenetlifypass!', field_type: 'password', is_sensitive: true },
        { field_name: 'Site URL', field_value: 'https://aaditium-trades.netlify.app', field_type: 'url', is_sensitive: false },
      );
      break;
    case 'Supabase':
      fields.push(
        { field_name: 'Email', field_value: 'amol@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Password', field_value: 'fakesupabasepass!', field_type: 'password', is_sensitive: true },
        { field_name: 'Project URL', field_value: 'https://fakeid.supabase.co', field_type: 'url', is_sensitive: false },
        { field_name: 'Project ID', field_value: 'fake-project-id-123', field_type: 'text', is_sensitive: false },
        { field_name: 'Anon Key', field_value: 'eyJfakeAnonKeyExample', field_type: 'secret', is_sensitive: true },
        { field_name: 'Service Role Key', field_value: 'eyJfakeServiceRoleKeyExample', field_type: 'secret', is_sensitive: true },
      );
      break;
    case 'AWS':
      fields.push(
        { field_name: 'Email', field_value: 'amol@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Password', field_value: 'fakeawspass123!', field_type: 'password', is_sensitive: true },
        { field_name: 'Account ID', field_value: '123456789012', field_type: 'text', is_sensitive: false },
        { field_name: 'Region', field_value: 'ap-south-1', field_type: 'text', is_sensitive: false },
        { field_name: 'Access Key', field_value: 'AKIAFAKEACCESSKEY', field_type: 'secret', is_sensitive: true },
        { field_name: 'Secret Key', field_value: 'fakeSecretAccessKeyExample', field_type: 'secret', is_sensitive: true },
      );
      break;
    case 'Bolt':
      fields.push(
        { field_name: 'Email', field_value: 'amol@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Password', field_value: 'fakeboltpass!', field_type: 'password', is_sensitive: true },
        { field_name: 'Project URL', field_value: 'https://bolt.new/project/fakeid', field_type: 'url', is_sensitive: false },
      );
      break;
    case 'Gmail':
      fields.push(
        { field_name: 'Email', field_value: 'amol.mohite@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Password', field_value: 'fakegmailpass!', field_type: 'password', is_sensitive: true },
        { field_name: 'Recovery Email', field_value: 'amol.recovery@example.com', field_type: 'email', is_sensitive: false },
        { field_name: 'Recovery Phone', field_value: '+91 98765 43210', field_type: 'text', is_sensitive: false },
      );
      break;
  }

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    // Note: sensitive values are stored as plaintext for demo seed since encryption key
    // is derived from password and isn't available here. In real use, the app encrypts them.
    await supabase.from('credential_fields').insert({
      credential_id: credId,
      field_name: f.field_name,
      field_value: f.field_value,
      field_type: f.field_type,
      is_sensitive: f.is_sensitive,
      sort_order: i,
      user_id: userId,
    });
  }
}
