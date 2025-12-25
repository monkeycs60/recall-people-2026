# Repository Guidelines

This is an EXPO application, developping a mobile app in React Native.

- NEVER TOUCH llm model name: I have determined the best model for the job, don't change it.

### Prohibited Practices

-  **No NativeWind/Tailwind classes**: NativeWind is unreliable and causes styling bugs. Use `StyleSheet.create()` or inline styles exclusively. Always use colors from `@/constants/theme.ts` (Colors, Spacing, BorderRadius, Typography).
-  **No SafeAreaView**: Use `View` + `useSafeAreaInsets()` instead.
-  **No useEffect**: Use fetch in server components via services, or handle side effects via event handlers
-  **No TypeScript any or as any**: Always use strong typing (not any or as any) ; if you need custom types, reuse them via @/types/ ; never use ts ignore comments.
-  **No OOP patterns**: Avoid classes or object-oriented approaches
-  **No Bad naming**: Use descriptive names for variables, functions, and components, it has to be explicit. When dealing with map, filter, reduce, etc., use don't use abbreviations for mapped variables (no 'c' for 'case', no 'i' for 'item', etc.)
-  **No Bad comments**: Never use comments to explain the code, it has to be explicit
-  **No more than 5 props**: When a component has more than 5 props, it is a sign that it is too complex and should be refactored (or pass props as a single object).

### Authentication

- We will use Better Auth for authentication, with Expo Integration. (https://www.better-auth.com/docs/integrations/expo)

### Required Practices

-  **Generic components**: Create reusable generic components in `@/components/ui/` if needed (shared trough apps, such as button, modal, etc.).
-  **Error handling**: Translate all Zod/API errors in both languages
-  **Self-explanatory code**: Avoid unnecessary comments
-  **User feedback (Sonner)**: For mutations that change data, trigger an ui notification when it improves UX.

## Architecture & Code Organization

### Project Structure

-  We use Expo folder structure for routing, so we don't use the app/ folder.
-  **Feature-based architecture**: Use feature folders for each app functionality
-  **Services layer**: Write all API/Prisma calls in `@/services/`
-  **Component splitting**: Refactor components/pages when > 350 lines

### Data Management

-  **Type safety**: Strong typing required (no `any` type)
-  **Global state**: Use Zustand stores in `lib/stores/` for state shared across distant components
-  **Store structure**: Separate state and actions interfaces, use TypeScript strict typing

### React Patterns

-  **Zustand usage**:
   -  Use for global state shared between distant components
   -  Create domain-specific stores (user, theme, preferences)
   -  Use selectors to optimize re-renders: `const user = useUserStore(state => state.user)`
   -  Include devtools middleware for debugging in development

## Quality Assurance

### Code Review Process

-  **Standards verification**: Ensure all guidelines are followed before commits
-  **Clean codebase**: Maintain high code quality and consistency

## Project Overview

Expo application with modern stack and strict development standards:

### Technology Stack

-  **Expo** with React Native and Turbopack
-  **TypeScript** with strict mode enabled
-  **StyleSheet/Inline styles** for styling (NO NativeWind/Tailwind)
-  **Zustand** for global state management

---

**Development Principle**: Write clean, type-safe, maintainable code that follows modern React/Next.js patterns while adhering to strict architectural guidelines.
