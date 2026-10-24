
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "alerts": {
                  Row: {
                    "acknowledged": boolean,"acknowledged_by": string | null,"device_id": string,"id": number,"message": string,"metric": string,"severity": string,"time": string,"value": number | null,"zscore": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged"?: boolean,"acknowledged_by"?: string | null,"device_id": string,"id"?: number,"message": string,"metric": string,"severity": string,"time"?: string,"value"?: number | null,"zscore"?: number | null
                  }
                  Update: {
                    "acknowledged"?: boolean,"acknowledged_by"?: string | null,"device_id"?: string,"id"?: number,"message"?: string,"metric"?: string,"severity"?: string,"time"?: string,"value"?: number | null,"zscore"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "device_latest"
      referencedColumns: ["device_id"]
    },{
      foreignKeyName: "alerts_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["device_id"]
    }
                  ]
                },"device_health": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_default": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261021": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261022": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261023": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261024": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261025": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261026": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261027": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"device_health_p20261028": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"health_score": number,"iforest_score": number | null,"max_abs_z": number | null,"status": string,"time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score": number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status": string,"time": string
                  }
                  Update: {
                    "device_id"?: string,"eta_metric"?: string | null,"eta_minutes"?: number | null,"health_score"?: number,"iforest_score"?: number | null,"max_abs_z"?: number | null,"status"?: string,"time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"devices": {
                  Row: {
                    "device_id": string,"first_seen": string | null,"last_seen": string | null,"name": string,"site": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"first_seen"?: string | null,"last_seen"?: string | null,"name": string,"site": string,"type": string
                  }
                  Update: {
                    "device_id"?: string,"first_seen"?: string | null,"last_seen"?: string | null,"name"?: string,"site"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"telemetry": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_1m": {
                  Row: {
                    "bucket": string,"current_avg": number | null,"current_max": number | null,"device_id": string,"pressure_avg": number | null,"pressure_min": number | null,"samples": number,"temperature_avg": number | null,"temperature_max": number | null,"vibration_avg": number | null,"vibration_max": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"current_avg"?: number | null,"current_max"?: number | null,"device_id": string,"pressure_avg"?: number | null,"pressure_min"?: number | null,"samples": number,"temperature_avg"?: number | null,"temperature_max"?: number | null,"vibration_avg"?: number | null,"vibration_max"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"current_avg"?: number | null,"current_max"?: number | null,"device_id"?: string,"pressure_avg"?: number | null,"pressure_min"?: number | null,"samples"?: number,"temperature_avg"?: number | null,"temperature_max"?: number | null,"vibration_avg"?: number | null,"vibration_max"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_default": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261021": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261022": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261023": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261024": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261025": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261026": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261027": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"telemetry_p20261028": {
                  Row: {
                    "current": number | null,"device_id": string,"pressure": number | null,"temperature": number | null,"time": string,"vibration": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current"?: number | null,"device_id": string,"pressure"?: number | null,"temperature"?: number | null,"time": string,"vibration"?: number | null
                  }
                  Update: {
                    "current"?: number | null,"device_id"?: string,"pressure"?: number | null,"temperature"?: number | null,"time"?: string,"vibration"?: number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "device_latest": {
                  Row: {
                    "device_id": string,"eta_metric": string | null,"eta_minutes": number | null,"first_seen": string | null,"health_score": number | null,"health_time": string | null,"iforest_score": number | null,"last_seen": string | null,"max_abs_z": number | null,"name": string,"site": string,"status": string | null,"type": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "get_device_history":
{ Args: { "p_device": string,"p_range": string }; Returns: {
              "bucket": string,"current_avg": number,"current_max": number,"pressure_avg": number,"pressure_min": number,"samples": number,"temperature_avg": number,"temperature_max": number,"vibration_avg": number,"vibration_max": number
            }[]
                           },
"get_fleet_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "alerts_bytes": number,"device_count": number,"device_health_bytes": number,"messages_per_second": number,"open_alerts": number,"telemetry_1m_bytes": number,"telemetry_bytes": number,"telemetry_rows_estimate": number
            }[]
                           },
"get_health_history":
{ Args: { "p_device": string,"p_hours"?: number }; Returns: {
              "bucket": string,"health_avg": number,"health_min": number,"worst_status": string
            }[]
                           },
"get_system_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"refresh_telemetry_1m":
{ Args: { "p_lookback"?: string }; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
