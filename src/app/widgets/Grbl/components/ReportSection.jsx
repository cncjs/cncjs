import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
} from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   isExpanded: boolean,
 *   onToggle: ({ isExpanded: boolean }) => void,
 *   title: string,
 * }} props
 */
function ReportSection({ children, isExpanded, onToggle, title }) {
  return (
    <Accordion border={1} borderColor="border.secondary">
      <AccordionItem isExpanded={isExpanded} onToggle={onToggle}>
        <AccordionHeader>{title}</AccordionHeader>
        <AccordionBody>{children}</AccordionBody>
      </AccordionItem>
    </Accordion>
  );
}

export default ReportSection;
