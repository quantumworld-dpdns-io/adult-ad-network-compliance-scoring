import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { impressions, conversions, settlementReports, type SettlementReport } from './schema.js';
import { createHash } from 'crypto';
import cron from 'node-cron';
import { type AuditLogService } from '../../audit-log/src/service.js';

export interface SettlementReportData {
  periodStart: Date;
  periodEnd: Date;
  periodType: string;
  impressions: {
    campaignId: string;
    publisherId: string;
    count: number;
    totalCost: number;
  }[];
  conversions: {
    campaignId: string;
    publisherId: string;
    count: number;
    totalValue: number;
  }[];
  totalImpressions: number;
  totalCost: number;
  totalConversions: number;
  totalValue: number;
}

export class SettlementService {
  constructor(
    private db: NodePgDatabase<any>,
    private auditLog?: AuditLogService
  ) {}

  async generateReport(
    periodStart: Date, 
    periodEnd: Date, 
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Promise<SettlementReport> {
    // 1. Aggregate impression data
    const impressionStats = await this.db
      .select({
        campaignId: impressions.campaignId,
        publisherId: impressions.publisherId,
        count: sql<number>`cast(count(*) as integer)`,
        totalCost: sql<number>`cast(sum(${impressions.cost}) as integer)`,
      })
      .from(impressions)
      .where(
        and(
          eq(impressions.status, 'valid'),
          gte(impressions.timestamp, periodStart),
          lte(impressions.timestamp, periodEnd)
        )
      )
      .groupBy(impressions.campaignId, impressions.publisherId);

    // 2. Aggregate conversion data
    const conversionStats = await this.db
      .select({
        campaignId: conversions.campaignId,
        publisherId: conversions.publisherId,
        count: sql<number>`cast(count(*) as integer)`,
        totalValue: sql<number>`cast(sum(${conversions.value}) as integer)`,
      })
      .from(conversions)
      .where(
        and(
          gte(conversions.timestamp, periodStart),
          lte(conversions.timestamp, periodEnd)
        )
      )
      .groupBy(conversions.campaignId, conversions.publisherId);

    // 3. Combine data
    const reportData: SettlementReportData = {
      periodStart,
      periodEnd,
      periodType,
      impressions: impressionStats as any,
      conversions: conversionStats as any,
      totalImpressions: impressionStats.reduce((acc, curr) => acc + Number(curr.count), 0),
      totalCost: impressionStats.reduce((acc, curr) => acc + Number(curr.totalCost), 0),
      totalConversions: conversionStats.reduce((acc, curr) => acc + Number(curr.count), 0),
      totalValue: conversionStats.reduce((acc, curr) => acc + Number(curr.totalValue), 0),
    };

    // 4. Calculate SHA-256 hash
    const reportHash = createHash('sha256').update(JSON.stringify(reportData)).digest('hex');

    // 5. Store report
    const [report] = await this.db
      .insert(settlementReports)
      .values({
        periodStart,
        periodEnd,
        periodType,
        reportData,
        reportHash,
      })
      .returning();

    // 6. Anchor in AuditLog
    if (this.auditLog) {
      await this.auditLog.appendEntry({
        eventType: 'SETTLEMENT_REPORT_GENERATED',
        actorId: 'settlement-service',
        affectedEntityId: report.id,
        afterState: {
          reportId: report.id,
          reportHash,
          periodType,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        },
        occurredAt: new Date(),
      });
    }

    return report;
  }

  async getReport(id: string): Promise<SettlementReport | undefined> {
    const [report] = await this.db.select().from(settlementReports).where(eq(settlementReports.id, id)).limit(1);
    return report;
  }

  async listReports(): Promise<SettlementReport[]> {
    return await this.db.select().from(settlementReports);
  }

  async exportReport(reportId: string, format: 'json' | 'csv'): Promise<string> {
    const report = await this.getReport(reportId);
    if (!report) throw new Error('Report not found');

    const data = report.reportData as SettlementReportData;

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV implementation
    let csv = 'Type,CampaignId,PublisherId,Count,TotalValue\n';
    
    data.impressions.forEach((imp: any) => {
      csv += `Impression,${imp.campaignId},${imp.publisherId},${imp.count},${imp.totalCost}\n`;
    });
    
    data.conversions.forEach((conv: any) => {
      csv += `Conversion,${conv.campaignId},${conv.publisherId},${conv.count},${conv.totalValue}\n`;
    });

    return csv;
  }

  setupCronJobs() {
    // Daily report at 00:05
    cron.schedule('5 0 * * *', async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      await this.generateReport(start, end, 'daily');
    });

    // Weekly report at 00:10 on Sunday
    cron.schedule('10 0 * * 0', async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      await this.generateReport(start, end, 'weekly');
    });

    // Monthly report at 00:15 on 1st of month
    cron.schedule('15 0 1 * *', async () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      const nextMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      await this.generateReport(start, nextMonth, 'monthly');
    });
  }
}
