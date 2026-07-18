import { memo } from 'react';

/**
 * CompanionSpeechBubble Component
 * 
 * Renders the dialog bubble floating directly above the Companion.
 * Utilizes CSS classes for seamless scaling and fade entry/exit.
 * 
 * Props:
 * - text: Speech string to render inside bubble
 * - isOpen: Boolean controlling visibility state
 */
const CompanionSpeechBubble = memo(function CompanionSpeechBubble({ text, isOpen }) {
  return (
    <div className={`panda-bubble ${isOpen ? 'panda-bubble--visible' : ''}`}>
      <div className="panda-bubble__inner">
        <p className="panda-bubble__text">{text}</p>
      </div>
      <div className="panda-bubble__arrow" />
    </div>
  );
});

export default CompanionSpeechBubble;
