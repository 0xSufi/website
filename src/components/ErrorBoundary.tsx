import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Check if it's the parseEther scientific notation error
    if (error.message && error.message.includes('invalid decimal value')) {
      console.error('ParseEther error detected - value likely in scientific notation');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page to reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="100vh"
          bg="#0a0a0a"
          color="white"
        >
          <VStack spacing={6} maxW="600px" p={8}>
            <Heading size="xl" color="#ef4444">
              Something went wrong
            </Heading>
            <Text color="#888" textAlign="center">
              An unexpected error occurred. This might be due to an invalid price value.
              Please try refreshing the page.
            </Text>
            {this.state.error && (
              <Box
                bg="#1a1a1a"
                border="1px solid #2a2a2a"
                borderRadius="md"
                p={4}
                w="100%"
                maxH="200px"
                overflowY="auto"
              >
                <Text fontSize="xs" color="#666" fontFamily="mono">
                  {this.state.error.message}
                </Text>
              </Box>
            )}
            <Button
              onClick={this.handleReset}
              bg="#4ade80"
              color="black"
              size="lg"
              fontWeight="600"
              _hover={{ bg: "#22c55e" }}
            >
              Reload Page
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
