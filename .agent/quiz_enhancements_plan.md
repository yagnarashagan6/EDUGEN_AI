# Quiz Enhancement Implementation Plan

## Overview
This document outlines the implementation plan for enhancing the quiz system with performance analytics and subtopic-based quiz generation.

## Current System Analysis

### RAG Model Integration ✅
Both study mode answers and quiz questions are generated using the RAG model:

1. **Study Mode (AI Answers)**:
   - Endpoint: `/api/rag/generate-answer` (rag_api.py lines 173-319)
   - Process: RAG retrieves context from PDF → Groq AI generates 16-mark structured answer
   - Fallback: General AI knowledge if PDF doesn't contain relevant content

2. **Quiz Questions**:
   - Endpoint: `/api/rag/generate-quiz` (rag_api.py lines 368-476)
   - Process: RAG retrieves context from PDF → Groq AI generates MCQs
   - Parameters: topic, subtopic, difficulty, question_count, cognitive_level

## Implementation Tasks

### Task 1: Quiz Performance Analytics in Staff Dashboard ✅

**Objective**: Show student performance analysis after quiz completion

**Features to Add**:
1. **Strength Analysis**: Topics/subtopics where student scored >75%
2. **Weakness Analysis**: Topics/subtopics where student scored <50%
3. **Average Performance**: Overall quiz score percentage
4. **Detailed Breakdown**: Question-by-question analysis

### Task 2: Subtopic-Based Quiz Generation ✅

**Objective**: Generate one quiz per subtopic instead of per topic

**Current Behavior**: Quiz generated for entire topic
**New Behavior**: Quiz generated for each subtopic individually

### Task 3: Student Dashboard Quiz Container Removal ✅

**Status**: Already implemented - no separate quiz container exists
**Current Implementation**: Quiz functionality integrated within tasks container

## Files to Modify

1. `src/staff/StaffDashboardViews.js` - Add QuizAnalyticsContainer
2. `src/pages/StaffDashboard.js` - Add quiz analytics logic
3. `edugen-backend/services/quizService.js` - Add performance calculation logic
4. `edugen-backend/routes/quizRoutes.js` - Add analytics endpoints
