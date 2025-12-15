"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

type Theme = "light" | "dark" | "system";

type UserSettings = {
  working_hours: number;
  timezone: string;
  auto_detect_breaks: boolean;
  enable_notifications: boolean;
  enable_email_notifications: boolean;
  allow_sharing: boolean;
  share_duration_days: number;
  theme: Theme;
};

type DbUserSettings = UserSettings & {
  user_id: number;
  created_at: Date;
  updated_at: Date;
};

export async function getUserSettings(userId: number) {
  try {
    const result = (await sql`
      SELECT 
        working_hours,
        timezone,
        auto_detect_breaks,
        enable_notifications,
        enable_email_notifications,
        allow_sharing,
        share_duration_days,
        theme
      FROM user_settings
      WHERE user_id = ${userId}
    `) as DbUserSettings[];

    if (!result || result.length === 0) {
      const defaultSettings: UserSettings = {
        working_hours: 8,
        timezone: "UTC",
        auto_detect_breaks: true,
        enable_notifications: true,
        enable_email_notifications: false,
        allow_sharing: false,
        share_duration_days: 7,
        theme: "system",
      };

      await sql`
        INSERT INTO user_settings (
          user_id,
          working_hours,
          timezone,
          auto_detect_breaks,
          enable_notifications,
          enable_email_notifications,
          allow_sharing,
          share_duration_days,
          theme
        ) VALUES (
          ${userId},
          ${defaultSettings.working_hours},
          ${defaultSettings.timezone},
          ${defaultSettings.auto_detect_breaks},
          ${defaultSettings.enable_notifications},
          ${defaultSettings.enable_email_notifications},
          ${defaultSettings.allow_sharing},
          ${defaultSettings.share_duration_days},
          ${defaultSettings.theme}
        )
      `;

      return {
        success: true,
        data: defaultSettings,
      };
    }

    const settings: UserSettings = {
      working_hours: result[0].working_hours,
      timezone: result[0].timezone,
      auto_detect_breaks: result[0].auto_detect_breaks,
      enable_notifications: result[0].enable_notifications,
      enable_email_notifications: result[0].enable_email_notifications,
      allow_sharing: result[0].allow_sharing,
      share_duration_days: result[0].share_duration_days,
      theme: result[0].theme as Theme,
    };

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return {
      success: false,
      error: "Failed to fetch user settings",
    };
  }
}

export async function updateUserSettings(
  userId: number,
  settings: Partial<UserSettings>
) {
  try {
    const existingSettings = (await sql`
      SELECT 1 FROM user_settings WHERE user_id = ${userId}
    `) as { "?column?": number }[];

    if (existingSettings.length === 0) {
      const defaultSettings: UserSettings = {
        working_hours: settings.working_hours ?? 8,
        timezone: settings.timezone ?? "UTC",
        auto_detect_breaks: settings.auto_detect_breaks ?? true,
        enable_notifications: settings.enable_notifications ?? true,
        enable_email_notifications:
          settings.enable_email_notifications ?? false,
        allow_sharing: settings.allow_sharing ?? false,
        share_duration_days: settings.share_duration_days ?? 7,
        theme: settings.theme ?? "system",
      };

      await sql`
        INSERT INTO user_settings (
          user_id,
          working_hours,
          timezone,
          auto_detect_breaks,
          enable_notifications,
          enable_email_notifications,
          allow_sharing,
          share_duration_days,
          theme
        ) VALUES (
          ${userId},
          ${defaultSettings.working_hours},
          ${defaultSettings.timezone},
          ${defaultSettings.auto_detect_breaks},
          ${defaultSettings.enable_notifications},
          ${defaultSettings.enable_email_notifications},
          ${defaultSettings.allow_sharing},
          ${defaultSettings.share_duration_days},
          ${defaultSettings.theme}
        )
      `;
    } else {
      // Build a dynamic UPDATE query with proper parameterization
      const queryParts: string[] = [];
      const values: any[] = [];
      let currentPart = 'UPDATE user_settings SET ';

      if (settings.working_hours !== undefined) {
        currentPart += 'working_hours = ';
        queryParts.push(currentPart);
        values.push(settings.working_hours);
        currentPart = '';
      }
      if (settings.timezone !== undefined) {
        currentPart += values.length > 0 ? ', timezone = ' : 'timezone = ';
        queryParts.push(currentPart);
        values.push(settings.timezone);
        currentPart = '';
      }
      if (settings.auto_detect_breaks !== undefined) {
        currentPart += values.length > 0 ? ', auto_detect_breaks = ' : 'auto_detect_breaks = ';
        queryParts.push(currentPart);
        values.push(settings.auto_detect_breaks);
        currentPart = '';
      }
      if (settings.enable_notifications !== undefined) {
        currentPart += values.length > 0 ? ', enable_notifications = ' : 'enable_notifications = ';
        queryParts.push(currentPart);
        values.push(settings.enable_notifications);
        currentPart = '';
      }
      if (settings.enable_email_notifications !== undefined) {
        currentPart += values.length > 0 ? ', enable_email_notifications = ' : 'enable_email_notifications = ';
        queryParts.push(currentPart);
        values.push(settings.enable_email_notifications);
        currentPart = '';
      }
      if (settings.allow_sharing !== undefined) {
        currentPart += values.length > 0 ? ', allow_sharing = ' : 'allow_sharing = ';
        queryParts.push(currentPart);
        values.push(settings.allow_sharing);
        currentPart = '';
      }
      if (settings.share_duration_days !== undefined) {
        currentPart += values.length > 0 ? ', share_duration_days = ' : 'share_duration_days = ';
        queryParts.push(currentPart);
        values.push(settings.share_duration_days);
        currentPart = '';
      }
      if (settings.theme !== undefined) {
        currentPart += values.length > 0 ? ', theme = ' : 'theme = ';
        queryParts.push(currentPart);
        values.push(settings.theme);
        currentPart = '';
      }

      if (values.length > 0) {
        currentPart += ' WHERE user_id = ';
        queryParts.push(currentPart);
        values.push(userId);
        queryParts.push('');

        // Convert to TemplateStringsArray format for the sql function
        const strings = Object.assign([...queryParts], { raw: [...queryParts] });

        await sql(strings as any as TemplateStringsArray, ...values);
      }
    }

    revalidatePath("/settings");

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("Error updating user settings:", error);
    return {
      success: false,
      error: "Failed to update user settings",
    };
  }
}
