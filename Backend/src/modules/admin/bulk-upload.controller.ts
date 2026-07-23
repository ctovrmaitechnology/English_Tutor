import {
  Controller, Post, Get, Res, UseGuards,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkUploadService } from './bulk-upload.service';

@ApiTags('Admin — Bulk Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  // GET /admin/users/bulk-template — download Excel template
  @Get('bulk-template')
  @ApiOperation({ summary: 'Download Excel template for bulk user upload' })
  downloadTemplate(@Res() res: Response) {
    const buffer = this.bulkUploadService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="vrm_buddy_users_template.xlsx"');
    res.send(buffer);
  }

  // POST /admin/users/bulk-upload — upload Excel and create users
  @Post('bulk-upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload Excel file to bulk-create user accounts' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Excel file (.xlsx)' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { error: 'No file uploaded.' };
    return this.bulkUploadService.bulkUpload(file.buffer);
  }
}