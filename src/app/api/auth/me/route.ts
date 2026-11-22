import { currentUser } from '../../../../lib/server/auth';
import { handleApiError, failure, success } from '../../../../lib/server/response';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    return success(user, 'Current user loaded');
  } catch (error) {
    return handleApiError(error);
  }
}
