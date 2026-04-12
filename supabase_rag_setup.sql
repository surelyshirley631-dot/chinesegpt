-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your course materials
create table if not exists public.course_materials (
  id bigint primary key generated always as identity,
  content text, -- The actual text content of the chunk
  metadata jsonb, -- Metadata like filename, page number, etc.
  embedding vector(768) -- Google Gemini text-embedding-004 uses 768 dimensions
);

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    course_materials.id,
    course_materials.content,
    course_materials.metadata,
    1 - (course_materials.embedding <=> query_embedding) as similarity
  from course_materials
  where 1 - (course_materials.embedding <=> query_embedding) > match_threshold
  order by course_materials.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Enable RLS (Row Level Security) if needed, currently open for read
alter table public.course_materials enable row level security;

-- Allow public read access (adjust based on your auth needs)
create policy "Allow public read access"
  on public.course_materials
  for select
  using (true);

-- Allow authenticated users to insert (for ingestion script if using service role, this might not be needed, but good to have)
create policy "Allow authenticated insert"
  on public.course_materials
  for insert
  with check (true);
