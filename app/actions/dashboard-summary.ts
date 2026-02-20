"use server"

import { sql } from "@/lib/db"
import { formatDuration } from "@/lib/utils"

export type SummaryData = {
  today: {
    duration: number
    breakTime: number
    netDuration: number
    percentChange: number
    breakCount: number
  }
  week: {
    duration: number
    breakTime: number
    netDuration: number
    percentChange: number
  }
  month: {
    duration: number
    breakTime: number
    netDuration: number
    percentChange: number
  }
  todayBreaks: {
    totalTime: number
    count: number
  }
}

export async function getDashboardSummary(
  userId: number,
): Promise<{ success: boolean; data?: SummaryData; error?: string }> {
  try {
    const tz = 'America/Sao_Paulo'

    // Get year, month (0-11), day (1-31) in BRT timezone from a given Date
    const getBrParts = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: 'numeric', day: 'numeric'
      }).formatToParts(d)

      return {
        year: parseInt(parts.find(p => p.type === 'year')!.value),
        month: parseInt(parts.find(p => p.type === 'month')!.value) - 1,
        date: parseInt(parts.find(p => p.type === 'day')!.value)
      }
    }

    const brParts = getBrParts(new Date())

    const createBrDate = (y: number, m: number, d: number, isEndOfDay: boolean) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      const timeStr = isEndOfDay ? "23:59:59.999" : "00:00:00.000"
      return new Date(`${y}-${pad(m + 1)}-${pad(d)}T${timeStr}-03:00`)
    }

    const getMathDate = (y: number, m: number, d: number) => new Date(y, m, d)

    // Today
    const { year, month, date } = brParts
    const todayMath = getMathDate(year, month, date)

    const startOfToday = createBrDate(year, month, date, false)
    const endOfToday = createBrDate(year, month, date, true)

    // Yesterday
    const yesterdayMath = new Date(todayMath)
    yesterdayMath.setDate(yesterdayMath.getDate() - 1)
    const startOfYesterday = createBrDate(yesterdayMath.getFullYear(), yesterdayMath.getMonth(), yesterdayMath.getDate(), false)
    const endOfYesterday = createBrDate(yesterdayMath.getFullYear(), yesterdayMath.getMonth(), yesterdayMath.getDate(), true)

    // This week (starting Sunday)
    const startOfWeekMath = new Date(todayMath)
    startOfWeekMath.setDate(startOfWeekMath.getDate() - startOfWeekMath.getDay())
    const startOfWeek = createBrDate(startOfWeekMath.getFullYear(), startOfWeekMath.getMonth(), startOfWeekMath.getDate(), false)

    // Last week
    const startOfLastWeekMath = new Date(startOfWeekMath)
    startOfLastWeekMath.setDate(startOfLastWeekMath.getDate() - 7)
    const startOfLastWeek = createBrDate(startOfLastWeekMath.getFullYear(), startOfLastWeekMath.getMonth(), startOfLastWeekMath.getDate(), false)

    const endOfLastWeekMath = new Date(startOfWeekMath)
    endOfLastWeekMath.setDate(endOfLastWeekMath.getDate() - 1)
    const endOfLastWeek = createBrDate(endOfLastWeekMath.getFullYear(), endOfLastWeekMath.getMonth(), endOfLastWeekMath.getDate(), true)

    // This month
    const startOfMonth = createBrDate(year, month, 1, false)

    // Last month
    const startOfLastMonthMath = new Date(year, month - 1, 1)
    const startOfLastMonth = createBrDate(startOfLastMonthMath.getFullYear(), startOfLastMonthMath.getMonth(), 1, false)

    const endOfLastMonthMath = new Date(year, month, 0) // Last day of last month
    const endOfLastMonth = createBrDate(endOfLastMonthMath.getFullYear(), endOfLastMonthMath.getMonth(), endOfLastMonthMath.getDate(), true)

    // Today's data
    const todayResult = await sql`
      WITH te_filtered AS (
          -- Step 1: Filter the time entries for the specific user and date
          SELECT 
              id,
              EXTRACT(EPOCH FROM (COALESCE(end_time, CURRENT_TIMESTAMP) - start_time)) * 1000 AS duration
          FROM time_entries
          WHERE user_id = ${userId}
            AND start_time >= ${startOfToday}
            AND start_time <= ${endOfToday}
      ),
      break_stats AS (
          -- Step 2: Aggregate break data per time entry
          SELECT 
              time_entry_id,
              COUNT(*) AS cnt,
              SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, CURRENT_TIMESTAMP) - start_time)) * 1000) AS break_duration
          FROM breaks
          WHERE time_entry_id IN (SELECT id FROM te_filtered)
          GROUP BY time_entry_id
      )
      -- Step 3: Join and sum everything once
      SELECT 
          COALESCE(SUM(te.duration), 0)::FLOAT AS total_duration,
          COALESCE(SUM(bs.break_duration), 0)::FLOAT AS total_break_time,
          COALESCE(SUM(bs.cnt), 0)::INT AS break_count
      FROM te_filtered te
      LEFT JOIN break_stats bs ON te.id = bs.time_entry_id;
    `

    // Yesterday's data
    const yesterdayResult = await sql`
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(te.end_time, CURRENT_TIMESTAMP) - te.start_time)) * 1000), 0)::float AS total_duration,
        COALESCE(SUM(
          COALESCE(
            (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_time, CURRENT_TIMESTAMP) - b.start_time)) * 1000)
             FROM breaks b
             WHERE b.time_entry_id = te.id),
            0
          )
        ), 0)::float AS total_break_time
      FROM time_entries te
      WHERE 
        te.user_id = ${userId} AND 
        te.start_time >= ${startOfYesterday} AND 
        te.start_time < ${endOfYesterday}
    `

    // This week's data
    const weekResult = await sql`
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(te.end_time, CURRENT_TIMESTAMP) - te.start_time)) * 1000), 0)::float AS total_duration,
        COALESCE(SUM(
          COALESCE(
            (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_time, CURRENT_TIMESTAMP) - b.start_time)) * 1000)
             FROM breaks b
             WHERE b.time_entry_id = te.id),
            0
          )
        ), 0)::float AS total_break_time
      FROM time_entries te
      WHERE 
        te.user_id = ${userId} AND 
        te.start_time >= ${startOfWeek} AND 
        te.start_time <= ${endOfToday}
    `

    // Last week's data
    const lastWeekResult = await sql`
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(te.end_time, CURRENT_TIMESTAMP) - te.start_time)) * 1000), 0)::float AS total_duration,
        COALESCE(SUM(
          COALESCE(
            (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_time, CURRENT_TIMESTAMP) - b.start_time)) * 1000)
             FROM breaks b
             WHERE b.time_entry_id = te.id),
            0
          )
        ), 0)::float AS total_break_time
      FROM time_entries te
      WHERE 
        te.user_id = ${userId} AND 
        te.start_time >= ${startOfLastWeek} AND 
        te.start_time < ${endOfLastWeek}
    `

    // This month's data
    const monthResult = await sql`
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(te.end_time, CURRENT_TIMESTAMP) - te.start_time)) * 1000), 0)::float AS total_duration,
        COALESCE(SUM(
          COALESCE(
            (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_time, CURRENT_TIMESTAMP) - b.start_time)) * 1000)
             FROM breaks b
             WHERE b.time_entry_id = te.id),
            0
          )
        ), 0)::float AS total_break_time
      FROM time_entries te
      WHERE 
        te.user_id = ${userId} AND 
        te.start_time >= ${startOfMonth} AND 
        te.start_time <= ${endOfToday}
    `

    // Last month's data
    const lastMonthResult = await sql`
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(te.end_time, CURRENT_TIMESTAMP) - te.start_time)) * 1000), 0)::float AS total_duration,
        COALESCE(SUM(
          COALESCE(
            (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_time, CURRENT_TIMESTAMP) - b.start_time)) * 1000)
             FROM breaks b
             WHERE b.time_entry_id = te.id),
            0
          )
        ), 0)::float AS total_break_time
      FROM time_entries te
      WHERE 
        te.user_id = ${userId} AND 
        te.start_time >= ${startOfLastMonth} AND 
        te.start_time < ${endOfLastMonth}
    `

    // Calculate percent changes
    const todayDuration = todayResult[0].total_duration
    const todayBreakTime = todayResult[0].total_break_time
    const todayNetDuration = todayDuration - todayBreakTime
    console.log(`Today's duration: ${formatDuration(todayDuration)}, break time: ${formatDuration(todayBreakTime)}, net duration: ${formatDuration(todayNetDuration)}`)

    const yesterdayDuration = yesterdayResult[0].total_duration
    const yesterdayBreakTime = yesterdayResult[0].total_break_time
    const yesterdayNetDuration = yesterdayDuration - yesterdayBreakTime

    const weekDuration = weekResult[0].total_duration
    const weekBreakTime = weekResult[0].total_break_time
    const weekNetDuration = weekDuration - weekBreakTime

    const lastWeekDuration = lastWeekResult[0].total_duration
    const lastWeekBreakTime = lastWeekResult[0].total_break_time
    const lastWeekNetDuration = lastWeekDuration - lastWeekBreakTime

    const monthDuration = monthResult[0].total_duration
    const monthBreakTime = monthResult[0].total_break_time
    const monthNetDuration = monthDuration - monthBreakTime

    const lastMonthDuration = lastMonthResult[0].total_duration
    const lastMonthBreakTime = lastMonthResult[0].total_break_time
    const lastMonthNetDuration = lastMonthDuration - lastMonthBreakTime

    // Calculate percent changes
    const todayPercentChange =
      yesterdayNetDuration === 0
        ? 100
        : Math.round(((todayNetDuration - yesterdayNetDuration) / yesterdayNetDuration) * 100)

    const weekPercentChange =
      lastWeekNetDuration === 0
        ? 100
        : Math.round(((weekNetDuration - lastWeekNetDuration) / lastWeekNetDuration) * 100)

    const monthPercentChange =
      lastMonthNetDuration === 0
        ? 100
        : Math.round(((monthNetDuration - lastMonthNetDuration) / lastMonthNetDuration) * 100)

    return {
      success: true,
      data: {
        today: {
          duration: todayDuration,
          breakTime: todayBreakTime,
          netDuration: todayNetDuration,
          percentChange: todayPercentChange,
          breakCount: Number.parseInt(todayResult[0].break_count) || 0,
        },
        week: {
          duration: weekDuration,
          breakTime: weekBreakTime,
          netDuration: weekNetDuration,
          percentChange: weekPercentChange,
        },
        month: {
          duration: monthDuration,
          breakTime: monthBreakTime,
          netDuration: monthNetDuration,
          percentChange: monthPercentChange,
        },
        todayBreaks: {
          totalTime: todayBreakTime,
          count: Number.parseInt(todayResult[0].break_count) || 0,
        },
      },
    }
  } catch (error) {
    console.error("Error getting dashboard summary:", error)
    return { success: false, error: "Failed to get dashboard summary" }
  }
}
