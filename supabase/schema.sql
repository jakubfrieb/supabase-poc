-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create issues table
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facilities_user_id ON public.facilities(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_facility_id ON public.issues(facility_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON public.issues(created_by);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);

-- Enable Row Level Security
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Facilities policies
CREATE POLICY "Users can view their own facilities"
    ON public.facilities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own facilities"
    ON public.facilities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facilities"
    ON public.facilities FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facilities"
    ON public.facilities FOR DELETE
    USING (auth.uid() = user_id);

-- Issues policies
CREATE POLICY "Users can view issues from their facilities"
    ON public.issues FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.facilities
            WHERE facilities.id = issues.facility_id
            AND facilities.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create issues in their facilities"
    ON public.issues FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.facilities
            WHERE facilities.id = facility_id
            AND facilities.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update issues in their facilities"
    ON public.issues FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.facilities
            WHERE facilities.id = issues.facility_id
            AND facilities.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete issues in their facilities"
    ON public.issues FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.facilities
            WHERE facilities.id = issues.facility_id
            AND facilities.user_id = auth.uid()
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
