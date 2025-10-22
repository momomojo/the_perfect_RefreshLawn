import React from 'react';
import { View, Text } from 'react-native';
import {
  PaymentStatus,
  WorkflowStatus,
  PaymentStatusType,
  WorkflowStatusType,
  PAYMENT_STATUS_COLORS,
  WORKFLOW_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  WORKFLOW_STATUS_LABELS,
} from '../../../lib/constants/bookingStatus';

interface StatusBadgeProps {
  paymentStatus?: PaymentStatusType | null;
  workflowStatus?: WorkflowStatusType | null;
  showBoth?: boolean; // If true, shows both statuses side by side
  size?: 'small' | 'medium' | 'large';
  style?: 'solid' | 'outlined'; // Solid background or outlined
}

/**
 * StatusBadge Component
 *
 * Displays payment and/or workflow status badges using the hybrid status system.
 * Can show one or both statuses with customizable appearance.
 *
 * @example
 * // Show both statuses
 * <StatusBadge
 *   paymentStatus="confirmed"
 *   workflowStatus="in_progress"
 *   showBoth
 * />
 *
 * @example
 * // Show only workflow status
 * <StatusBadge workflowStatus="completed" />
 *
 * @example
 * // Small outlined style
 * <StatusBadge
 *   paymentStatus="pending"
 *   size="small"
 *   style="outlined"
 * />
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  paymentStatus,
  workflowStatus,
  showBoth = false,
  size = 'medium',
  style = 'solid',
}) => {
  // Size styles
  const sizeStyles = {
    small: {
      container: 'px-2 py-0.5',
      text: 'text-xs',
      separator: 'mx-1 text-xs',
    },
    medium: {
      container: 'px-3 py-1',
      text: 'text-sm',
      separator: 'mx-1.5 text-sm',
    },
    large: {
      container: 'px-4 py-1.5',
      text: 'text-base',
      separator: 'mx-2 text-base',
    },
  };

  const currentSize = sizeStyles[size];

  // Render a single badge
  const renderBadge = (
    status: PaymentStatusType | WorkflowStatusType,
    type: 'payment' | 'workflow'
  ) => {
    const colors =
      type === 'payment' ? PAYMENT_STATUS_COLORS : WORKFLOW_STATUS_COLORS;
    const labels =
      type === 'payment' ? PAYMENT_STATUS_LABELS : WORKFLOW_STATUS_LABELS;

    const colorConfig = colors[status as keyof typeof colors];
    const label = labels[status as keyof typeof labels] || status;

    if (!colorConfig) return null;

    // Solid style: colored background with white text
    if (style === 'solid') {
      return (
        <View
          className={`${colorConfig.bg} ${currentSize.container} rounded-full`}
        >
          <Text
            className={`${colorConfig.text} ${currentSize.text} text-center font-semibold`}
          >
            {label}
          </Text>
        </View>
      );
    }

    // Outlined style: border with colored text
    return (
      <View
        className={`${colorConfig.border} border ${currentSize.container} rounded-full`}
      >
        <Text
          className={`${colorConfig.text} ${currentSize.text} text-center font-semibold`}
        >
          {label}
        </Text>
      </View>
    );
  };

  // If showing both statuses
  if (showBoth && paymentStatus && workflowStatus) {
    return (
      <View className="flex-row items-center">
        {renderBadge(paymentStatus, 'payment')}
        <Text className={`text-gray-400 ${currentSize.separator}`}>•</Text>
        {renderBadge(workflowStatus, 'workflow')}
      </View>
    );
  }

  // Show only payment status if provided
  if (paymentStatus) {
    return <>{renderBadge(paymentStatus, 'payment')}</>;
  }

  // Show only workflow status if provided
  if (workflowStatus) {
    return <>{renderBadge(workflowStatus, 'workflow')}</>;
  }

  // No status provided
  return (
    <View className={`bg-gray-200 ${currentSize.container} rounded-full`}>
      <Text className={`text-gray-600 ${currentSize.text} font-semibold`}>
        Unknown
      </Text>
    </View>
  );
};

/**
 * StatusBadgeRow Component
 *
 * Displays payment and workflow status badges in a vertical stack.
 * Useful for compact displays where horizontal space is limited.
 */
interface StatusBadgeRowProps {
  paymentStatus?: PaymentStatusType | null;
  workflowStatus?: WorkflowStatusType | null;
  size?: 'small' | 'medium' | 'large';
}

export const StatusBadgeRow: React.FC<StatusBadgeRowProps> = ({
  paymentStatus,
  workflowStatus,
  size = 'small',
}) => {
  return (
    <View className="space-y-1">
      {paymentStatus && (
        <StatusBadge paymentStatus={paymentStatus} size={size} />
      )}
      {workflowStatus && (
        <StatusBadge workflowStatus={workflowStatus} size={size} />
      )}
    </View>
  );
};

/**
 * StatusText Component
 *
 * Simple text-only status display (no badge styling).
 * Useful for inline status mentions.
 */
interface StatusTextProps {
  paymentStatus?: PaymentStatusType | null;
  workflowStatus?: WorkflowStatusType | null;
  separator?: string;
}

export const StatusText: React.FC<StatusTextProps> = ({
  paymentStatus,
  workflowStatus,
  separator = ' • ',
}) => {
  const parts: string[] = [];

  if (paymentStatus) {
    parts.push(PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus);
  }

  if (workflowStatus) {
    parts.push(WORKFLOW_STATUS_LABELS[workflowStatus] || workflowStatus);
  }

  if (parts.length === 0) {
    return <Text className="text-gray-500">Unknown Status</Text>;
  }

  return (
    <Text className="font-medium capitalize text-gray-700">
      {parts.join(separator)}
    </Text>
  );
};

export default StatusBadge;
