import React from 'react';
import { AIPopoutAssistant, sanitizeAssistantMarkdown } from './AIPopoutAssistant';

interface RetentionAssistantProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const RetentionAssistant: React.FC<RetentionAssistantProps> = (props) => {
  return <AIPopoutAssistant {...props} />;
};

export { sanitizeAssistantMarkdown };
export default RetentionAssistant;

