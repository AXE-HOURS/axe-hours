import React, { createContext, useContext, useState } from 'react';

interface CalibrationBridgeContextType {
  calibrationHook: string;
  setCalibrationHook: (hook: string) => void;
  sendToCalibrationLab: (hook: string, changeView?: () => void) => void;
}

const CalibrationBridgeContext = createContext<CalibrationBridgeContextType | undefined>(undefined);

export const CalibrationBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calibrationHook, setCalibrationHook] = useState<string>('');

  const sendToCalibrationLab = (hook: string, changeView?: () => void) => {
    setCalibrationHook(hook);
    if (changeView) {
      changeView();
    }
  };

  return (
    <CalibrationBridgeContext.Provider value={{ calibrationHook, setCalibrationHook, sendToCalibrationLab }}>
      {children}
    </CalibrationBridgeContext.Provider>
  );
};

export const useCalibrationBridge = () => {
  const context = useContext(CalibrationBridgeContext);
  if (!context) {
    throw new Error('useCalibrationBridge must be used within a CalibrationBridgeProvider');
  }
  return context;
};
