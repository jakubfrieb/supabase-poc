# Contributing to Facility Manager

Thank you for your interest in contributing to Facility Manager! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Device/OS information
   - App version

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach
   - Any relevant examples or mockups

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes following our coding standards
4. Test your changes thoroughly
5. Commit with clear, descriptive messages
6. Push to your fork
7. Submit a pull request

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

### Component Structure

```typescript
// 1. Imports
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Component
export function MyComponent({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
}

// 4. Styles
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
```

### Commit Messages

Use clear, descriptive commit messages:

- `feat: Add facility search functionality`
- `fix: Resolve issue with status update`
- `docs: Update setup guide`
- `style: Improve button styling`
- `refactor: Simplify auth context logic`
- `test: Add tests for facility hooks`

### Testing

Before submitting a PR:

1. Test on both iOS and Android (or web)
2. Verify all existing features still work
3. Test with different screen sizes
4. Check for TypeScript errors: `npx tsc --noEmit`
5. Verify no console warnings/errors

## Project Areas

### Good First Issues

- UI/UX improvements
- Documentation updates
- Bug fixes
- Adding comments to code

### Intermediate

- New feature implementation
- Performance optimizations
- Database schema updates
- Navigation improvements

### Advanced

- Architecture changes
- Security enhancements
- Real-time features
- Offline support

## Questions?

If you have questions:
- Open an issue with "Question:" prefix
- Check existing documentation
- Review closed issues and PRs

Thank you for contributing!
