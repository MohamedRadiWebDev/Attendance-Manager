
import { z } from "zod";
import { 
  insertEmployeeSchema, 
  insertPunchSchema, 
  insertMissionSchema, 
  insertPermissionSchema, 
  insertLeaveSchema, 
  insertSpecialRuleSchema,
  dailyAttendance,
  employees,
  specialRules,
  RULE_TYPES,
  SCOPE_TYPES
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === UPLOAD / IMPORT ===
  import: {
    // We'll use a single endpoint to accept different file types
    // The query param 'type' will specify: 'punches' | 'master' | 'missions' | 'leaves'
    upload: {
      method: "POST" as const,
      path: "/api/import/:type",
      // input is FormData, handled in the route handler manually
      responses: {
        200: z.object({ 
          success: z.boolean(), 
          count: z.number(), 
          errors: z.array(z.string()) 
        }),
        400: errorSchemas.validation,
      }
    },
    clear: {
      method: "POST" as const,
      path: "/api/import/clear",
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
  },

  // === DATA RETRIEVAL ===
  employees: {
    list: {
      method: "GET" as const,
      path: "/api/employees",
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      }
    }
  },
  
  attendance: {
    // Get calculated daily grid
    list: {
      method: "GET" as const,
      path: "/api/attendance",
      input: z.object({
        month: z.string().optional(), // YYYY-MM
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof dailyAttendance.$inferSelect>()),
      }
    },
    // Trigger Recalculation (Explicit)
    calculate: {
      method: "POST" as const,
      path: "/api/attendance/calculate",
      responses: {
        200: z.object({ 
          success: z.boolean(), 
          processedCount: z.number() 
        }),
      }
    }
  },

  specialRules: {
    list: {
      method: "GET" as const,
      path: "/api/special-rules",
      responses: {
        200: z.array(z.custom<typeof specialRules.$inferSelect>()),
      }
    },
    get: {
      method: "GET" as const,
      path: "/api/special-rules/:id",
      responses: {
        200: z.custom<typeof specialRules.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: "POST" as const,
      path: "/api/special-rules",
      input: insertSpecialRuleSchema,
      responses: {
        200: z.custom<typeof specialRules.$inferSelect>(),
      }
    },
    update: {
      method: "PUT" as const,
      path: "/api/special-rules/:id",
      input: insertSpecialRuleSchema.partial(),
      responses: {
        200: z.custom<typeof specialRules.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/special-rules/:id",
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    },
    import: {
      method: "POST" as const,
      path: "/api/special-rules/import",
      responses: {
        200: z.object({ 
          success: z.boolean(), 
          count: z.number(), 
          errors: z.array(z.string()) 
        }),
      }
    },
    export: {
      method: "GET" as const,
      path: "/api/special-rules/export",
      responses: {
        200: z.any(),
      }
    }
  },
  
  export: {
    // Return a blob/file
    attendance: {
      method: "GET" as const,
      path: "/api/export/attendance",
      responses: {
        200: z.any(), // Blob
      }
    },
    summary: {
      method: "GET" as const,
      path: "/api/export/summary",
      responses: {
        200: z.any(), // Blob
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
