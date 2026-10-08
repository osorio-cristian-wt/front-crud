// Mock de los .svg para Jest.
// El transformador de react-scripts 5 genera elementos con el formato de React 18
// y React 19 los rechaza ("A React Element from an older version of React was rendered").
import React from 'react';

const SvgMock = React.forwardRef((props, ref) => <svg ref={ref} {...props} />);

export const ReactComponent = SvgMock;
export default 'svg-mock';
