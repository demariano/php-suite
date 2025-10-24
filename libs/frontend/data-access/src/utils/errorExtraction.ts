/**
 * Utility function to extract error messages from API responses
 * Handles both axios errors and generic errors with proper fallbacks
 */

export interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

/**
 * Extracts error message from API error response
 * @param error - The error object from catch block
 * @param fallbackMessage - Generic fallback message if no specific message found
 * @returns The extracted error message or fallback message
 */
export function extractErrorMessage(error: unknown, fallbackMessage: string): string {
    // Handle axios errors with response data
    if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.message) {
            return apiError.response.data.message;
        }
    }

    // Handle generic errors with message property
    if (error && typeof error === 'object' && 'message' in error) {
        const genericError = error as { message: string };
        if (genericError.message) {
            return genericError.message;
        }
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    // Fallback to provided generic message
    return fallbackMessage;
}
