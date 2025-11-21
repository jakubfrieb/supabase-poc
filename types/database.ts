export interface Database {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string | null;
          user_id: string;
          subscription_status: 'pending' | 'paused' | 'active';
          paid_until: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          address?: string | null;
          user_id: string;
          subscription_status?: 'pending' | 'paused' | 'active';
          paid_until?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          user_id?: string;
          subscription_status?: 'pending' | 'paused' | 'active';
          paid_until?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      issues: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority: 'idea' | 'normal' | 'high' | 'critical' | 'urgent';
          facility_id: string;
          created_by: string;
          requires_cooperation: boolean | null;
          cooperation_user_id: string | null;
          assigned_provider_id: string | null;
          selected_appointment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          facility_id: string;
          created_by: string;
          requires_cooperation?: boolean | null;
          cooperation_user_id?: string | null;
          assigned_provider_id?: string | null;
          selected_appointment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          facility_id?: string;
          created_by?: string;
          requires_cooperation?: boolean | null;
          cooperation_user_id?: string | null;
          assigned_provider_id?: string | null;
          selected_appointment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          default_price: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          default_price?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          default_price?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_providers: {
        Row: {
          user_id: string;
          company_name: string;
          ico: string | null;
          dic: string | null;
          address: string | null;
          phone: string;
          billing_email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          company_name: string;
          ico?: string | null;
          dic?: string | null;
          address?: string | null;
          phone: string;
          billing_email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          company_name?: string;
          ico?: string | null;
          dic?: string | null;
          address?: string | null;
          phone?: string;
          billing_email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_registrations: {
        Row: {
          id: string;
          provider_id: string;
          service_id: string;
          status: 'pending' | 'active' | 'expired';
          paid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          service_id: string;
          status?: 'pending' | 'active' | 'expired';
          paid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          service_id?: string;
          status?: 'pending' | 'active' | 'expired';
          paid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_vouchers: {
        Row: {
          code: string;
          months: number;
          active: boolean;
          expires_at: string | null;
          max_uses: number;
          created_at: string;
        };
        Insert: {
          code: string;
          months?: number;
          active?: boolean;
          expires_at?: string | null;
          max_uses?: number;
          created_at?: string;
        };
        Update: {
          code?: string;
          months?: number;
          active?: boolean;
          expires_at?: string | null;
          max_uses?: number;
          created_at?: string;
        };
      };
      service_voucher_uses: {
        Row: {
          id: string;
          voucher_code: string;
          provider_id: string;
          used_at: string;
        };
        Insert: {
          id?: string;
          voucher_code: string;
          provider_id: string;
          used_at?: string;
        };
        Update: {
          id?: string;
          voucher_code?: string;
          provider_id?: string;
          used_at?: string;
        };
      };
      issue_service_requests: {
        Row: {
          id: string;
          issue_id: string;
          service_id: string;
          status: 'open' | 'closed';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          service_id: string;
          status?: 'open' | 'closed';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          service_id?: string;
          status?: 'open' | 'closed';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_applications: {
        Row: {
          id: string;
          request_id: string;
          provider_id: string;
          status: 'pending' | 'selected' | 'rejected';
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          provider_id: string;
          status?: 'pending' | 'selected' | 'rejected';
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          provider_id?: string;
          status?: 'pending' | 'selected' | 'rejected';
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_appointments: {
        Row: {
          id: string;
          issue_id: string;
          provider_id: string;
          proposed_date: string;
          proposed_time: string;
          proposed_by: string;
          proposed_at: string;
          status: 'proposed' | 'confirmed' | 'rejected' | 'completed';
          confirmed_by: string | null;
          confirmed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          issue_id: string;
          provider_id: string;
          proposed_date: string;
          proposed_time: string;
          proposed_by: string;
          proposed_at?: string;
          status?: 'proposed' | 'confirmed' | 'rejected' | 'completed';
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          issue_id?: string;
          provider_id?: string;
          proposed_date?: string;
          proposed_time?: string;
          proposed_by?: string;
          proposed_at?: string;
          status?: 'proposed' | 'confirmed' | 'rejected' | 'completed';
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_payments: {
        Row: {
          id: string;
          registration_id: string;
          amount: number;
          status: 'pending' | 'confirmed' | 'rejected';
          payment_reference: string | null;
          payment_instructions: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          amount: number;
          status?: 'pending' | 'confirmed' | 'rejected';
          payment_reference?: string | null;
          payment_instructions?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          amount?: number;
          status?: 'pending' | 'confirmed' | 'rejected';
          payment_reference?: string | null;
          payment_instructions?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Facility = Database['public']['Tables']['facilities']['Row'];
export type Issue = Database['public']['Tables']['issues']['Row'];
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type IssuePriority = 'idea' | 'normal' | 'high' | 'critical' | 'urgent';

export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceProvider = Database['public']['Tables']['service_providers']['Row'];
export type ServiceRegistration = Database['public']['Tables']['service_registrations']['Row'];
export type ServiceVoucher = Database['public']['Tables']['service_vouchers']['Row'];
export type ServiceVoucherUse = Database['public']['Tables']['service_voucher_uses']['Row'];
export type IssueServiceRequest = Database['public']['Tables']['issue_service_requests']['Row'];
export type ServiceApplication = Database['public']['Tables']['service_applications']['Row'];
export type ServiceAppointment = Database['public']['Tables']['service_appointments']['Row'];
export type ServicePayment = Database['public']['Tables']['service_payments']['Row'];
