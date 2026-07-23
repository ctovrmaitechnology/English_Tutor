import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { User } from '../users/user.entity';

export interface BulkUploadResult {
  total:   number;
  created: number;
  failed:  number;
  rows: {
    row:     number;
    name:    string;
    email:   string;
    status:  'created' | 'failed';
    reason?: string;
  }[];
}

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Generate template Excel buffer ─────────────────────────────────────────
  generateTemplate(): Buffer {
    const wb = XLSX.utils.book_new();

    // Sample data rows
    const data = [
      ['First Name', 'Last Name', 'Username', 'Email', 'Password', 'Batch', 'Role'],
      ['Arun',       'Kumar',     'arunkumar','arun@company.com',  'Pass@123', 'Batch A', 'Agent'],
      ['Priya',      'Sharma',    'priyasharma','priya@company.com','Pass@123', 'Batch A', 'Agent'],
      ['John',       'Doe',       'johndoe',  'john@company.com',  'Pass@123', 'Batch B', 'Agent'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  // ── Parse uploaded Excel ───────────────────────────────────────────────────
  private parseExcel(buffer: Buffer): any[] {
    const wb   = XLSX.read(buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (!rows.length) return [];

    // First row is header — skip it
    const headers = (rows[0] as string[]).map(h => h?.toString().toLowerCase().trim());
    const dataRows = rows.slice(1).filter(r => r.some(cell => cell !== undefined && cell !== ''));

    return dataRows.map(row => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = row[i]?.toString().trim() || ''; });
      return obj;
    });
  }

  private normalizeRow(raw: any): {
    firstName: string; lastName: string; username: string;
    email: string; password: string; batch: string; role: string;
  } {
    // Support both "first name" and "firstname" style headers
    return {
      firstName: raw['first name'] || raw['firstname'] || raw['first_name'] || '',
      lastName:  raw['last name']  || raw['lastname']  || raw['last_name']  || '',
      username:  raw['username']   || raw['user name'] || raw['user_name']  || '',
      email:     raw['email']      || raw['email address'] || '',
      password:  raw['password']   || raw['pass']      || 'VrmBuddy@123',
      batch:     raw['batch']      || raw['batch name'] || 'Batch A',
      role:      raw['role']       || 'Agent',
    };
  }

  // ── Bulk upload users ──────────────────────────────────────────────────────
  async bulkUpload(buffer: Buffer): Promise<BulkUploadResult> {
    const rawRows = this.parseExcel(buffer);
    const result: BulkUploadResult = {
      total: rawRows.length, created: 0, failed: 0, rows: [],
    };

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is header
      const data   = this.normalizeRow(rawRows[i]);
      const name   = `${data.firstName} ${data.lastName}`.trim() || `Row ${rowNum}`;

      try {
        // Validation
        if (!data.firstName) throw new Error('First name is required');
        if (!data.email || !data.email.includes('@')) throw new Error('Valid email is required');
        if (!data.username) throw new Error('Username is required');
        if (data.username.length > 20) throw new Error('Username must be 20 chars or less');

        // Check duplicates
        const existing = await this.userRepo.findOne({
          where: [{ email: data.email }, { username: data.username }],
        });
        if (existing) {
          if (existing.email === data.email) throw new Error('Email already exists');
          throw new Error('Username already taken');
        }

        // Create user
        const user = this.userRepo.create({
          id:            ulid(),
          first_name:    data.firstName,
          last_name:     data.lastName,
          username:      data.username.toLowerCase().replace(/\s+/g, ''),
          email:         data.email.toLowerCase(),
          password_hash: await bcrypt.hash(data.password || 'VrmBuddy@123', 10),
          phone:         '',
          character:     'eva',
          is_active:     true,
          batch:         data.batch  || 'Batch A',
          role:          data.role   || 'Agent',
          hasSelectedCharacter: false,
        } as any);

        await this.userRepo.save(user);
        result.created++;
        result.rows.push({ row: rowNum, name, email: data.email, status: 'created' });
        this.logger.log(`Bulk upload: created user ${data.email}`);

        // Small delay to avoid overwhelming the DB
        await new Promise(r => setTimeout(r, 50));

      } catch (err: any) {
        result.failed++;
        result.rows.push({
          row: rowNum, name, email: data.email || '—',
          status: 'failed', reason: err?.message || 'Unknown error',
        });
        this.logger.warn(`Bulk upload: failed row ${rowNum} (${data.email}): ${err?.message}`);
      }
    }

    this.logger.log(`Bulk upload complete: ${result.created} created, ${result.failed} failed out of ${result.total}`);
    return result;
  }
}