import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { CoursesService } from './courses.service';

class SubmitQuizDto {
  answers: number[];
}

class CreateCourseDto {
  title: string;
  description?: string;
  coverUrl?: string;
  minimumCompletion?: number;
}

class UpdateCourseDto {
  title?: string;
  description?: string;
  coverUrl?: string;
  minimumCompletion?: number;
  isPublished?: boolean;
}

class CreateModuleDto {
  title: string;
  videoUrl?: string;
  duration?: number;
}

class UpdateModuleDto {
  title?: string;
  videoUrl?: string;
  duration?: number;
  order?: number;
}

class CreateQuizQuestionDto {
  question: string;
  options: string[];
  correctIndex: number;
}

// ── Participant-facing (JWT) ───────────────────────────────────────────────

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':courseId')
  @ApiOperation({ summary: 'Get course details and enrollment' })
  getCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.getCourse(courseId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':courseId/modules/:moduleId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a module as completed' })
  completeModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.completeModule(courseId, moduleId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':courseId/modules/:moduleId/quiz')
  @ApiOperation({ summary: 'Get quiz questions for a module' })
  getModuleQuiz(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.getModuleQuiz(courseId, moduleId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':courseId/modules/:moduleId/quiz')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit quiz answers for a module' })
  submitQuiz(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.submitQuiz(courseId, moduleId, dto.answers, user.id);
  }

  // ── Organizer module/question management ──────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':courseId')
  @ApiOperation({ summary: 'Update a course (organizer)' })
  updateCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.updateCourse(courseId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':courseId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a course (organizer)' })
  deleteCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.deleteCourse(courseId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':courseId/modules')
  @ApiOperation({ summary: 'Add a module to a course (organizer)' })
  addModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.addModule(courseId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':courseId/modules/:moduleId')
  @ApiOperation({ summary: 'Update a module (organizer)' })
  updateModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.updateModule(courseId, moduleId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':courseId/modules/:moduleId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a module (organizer)' })
  deleteModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.deleteModule(courseId, moduleId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':courseId/modules/:moduleId/questions')
  @ApiOperation({ summary: 'Add a quiz question to a module (organizer)' })
  addQuizQuestion(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateQuizQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.addQuizQuestion(courseId, moduleId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':courseId/modules/:moduleId/questions/:questionId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a quiz question (organizer)' })
  deleteQuizQuestion(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.deleteQuizQuestion(
      courseId,
      moduleId,
      questionId,
      user.id,
    );
  }
}

// ── Event-scoped course management (organizer) ────────────────────────────

@ApiTags('Courses')
@Controller('events/:eventId/courses')
export class EventCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List courses for an event (organizer)' })
  getEventCourses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.getEventCourses(eventId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a course for an event (organizer)' })
  createCourse(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.createCourse(eventId, user.id, dto);
  }
}
