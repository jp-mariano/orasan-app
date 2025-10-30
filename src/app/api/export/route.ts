import { NextResponse } from 'next/server';

import JSZip from 'jszip';

import { createClient } from '@/lib/supabase/server';

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows || rows.length === 0) {
    return '\uFEFF';
  }

  // Build header as union of keys across all rows
  const headerKeys = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row || {}).forEach(k => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    // Escape double quotes by doubling them, and wrap in quotes
    return '"' + str.replace(/"/g, '""') + '"';
  };

  const headerLine = headerKeys
    .map(k => '"' + k.replace(/"/g, '""') + '"')
    .join(',');
  const dataLines = rows.map(row =>
    headerKeys
      .map(key => escapeCell((row as Record<string, unknown>)[key]))
      .join(',')
  );

  // Add UTF-8 BOM for Excel compatibility
  return '\uFEFF' + [headerLine, ...dataLines].join('\n');
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build queries map and resolve in parallel
    const queries = {
      user: supabase.from('users').select('*').eq('id', user.id).single(),
      projects: supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      tasks: supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      time_entries: supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      work_sessions: supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      invoices: supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    } as const;

    const resultsArray = await Promise.all(Object.values(queries));
    const results = Object.fromEntries(
      Object.keys(queries).map((k, i) => [k, resultsArray[i]])
    ) as unknown as Record<
      keyof typeof queries,
      { data: unknown; error: { message: string } | null }
    >;

    for (const res of Object.values(results)) {
      if (res.error) {
        return NextResponse.json({ error: res.error.message }, { status: 500 });
      }
    }

    const zip = new JSZip();
    const root = zip.folder('export');
    const jsonFolder = root?.folder('json');
    const csvFolder = root?.folder('csv');

    // Add JSON files
    jsonFolder?.file(
      'user.json',
      JSON.stringify(results.user.data || null, null, 2)
    );
    jsonFolder?.file(
      'projects.json',
      JSON.stringify(results.projects.data || [], null, 2)
    );
    jsonFolder?.file(
      'tasks.json',
      JSON.stringify(results.tasks.data || [], null, 2)
    );
    jsonFolder?.file(
      'time_entries.json',
      JSON.stringify(results.time_entries.data || [], null, 2)
    );
    jsonFolder?.file(
      'work_sessions.json',
      JSON.stringify(results.work_sessions.data || [], null, 2)
    );
    jsonFolder?.file(
      'invoices.json',
      JSON.stringify(results.invoices.data || [], null, 2)
    );

    // CSV files for flat tables
    csvFolder?.file(
      'user.csv',
      toCsv(
        (results.user.data ? [results.user.data] : []) as Array<
          Record<string, unknown>
        >
      )
    );
    csvFolder?.file(
      'projects.csv',
      toCsv((results.projects.data as Array<Record<string, unknown>>) || [])
    );
    csvFolder?.file(
      'tasks.csv',
      toCsv((results.tasks.data as Array<Record<string, unknown>>) || [])
    );
    csvFolder?.file(
      'time_entries.csv',
      toCsv((results.time_entries.data as Array<Record<string, unknown>>) || [])
    );
    csvFolder?.file(
      'work_sessions.csv',
      toCsv(
        (results.work_sessions.data as Array<Record<string, unknown>>) || []
      )
    );
    csvFolder?.file(
      'invoices.csv',
      toCsv((results.invoices.data as Array<Record<string, unknown>>) || [])
    );

    // README documentation
    const readme = `Orasan Data Export\n\nContents:\n- json/user.json\n- json/projects.json\n- json/tasks.json\n- json/time_entries.json\n- json/work_sessions.json\n- json/invoices.json\n- csv/user.csv\n- csv/projects.csv\n- csv/tasks.csv\n- csv/time_entries.csv\n- csv/work_sessions.csv\n- csv/invoices.csv\n\nNotes:\n- JSON is the authoritative, lossless export.\n- CSV is provided for spreadsheet users; nested fields are JSON-stringified.\n- Timestamps are ISO 8601 (UTC). IDs are strings.\n- Relationships:\n  - tasks.project_id links tasks to projects\n  - time_entries.task_id and time_entries.project_id link to tasks/projects\n  - work_sessions may link to time_entries via time_entry_id (if present)\n  - invoices may link to projects or users depending on schema\n`;
    root?.file('README.txt', readme);

    const content = await zip.generateAsync({ type: 'uint8array' });

    const filename = `orasan-export-${new Date()
      .toISOString()
      .slice(0, 10)}.zip`;

    return new NextResponse(Buffer.from(content), {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      }),
    });
  } catch (error) {
    console.error('Error in export API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
