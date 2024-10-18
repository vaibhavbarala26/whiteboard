import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { FaPen } from 'react-icons/fa';
import { CiEraser } from 'react-icons/ci';
import { MdDelete, MdUndo, MdRedo } from "react-icons/md"; 
import "./App.css";

type Color = string;
const colors: Color[] = ['red', 'blue', 'green', 'black', 'orange', 'yellow'];
const widths: number[] = [1, 5, 10, 15, 20]; 

interface LineData {
    tool: string;
    width: number;
    points: number[];
    color: string;
}

const Canvas = () => {
    const [tool, setTool] = useState<string>('pen');
    const [width, setWidth] = useState<number>(5);
    const [lines, setLines] = useState<LineData[]>([]);
    const [undoStack, setUndoStack] = useState<LineData[][]>([]);
    const [redoStack, setRedoStack] = useState<LineData[][]>([]);
    const isDrawing = useRef<boolean>(false);
    const [color, setColor] = useState<string>('black');
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const handleMouseDown = (e: any) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setLines((prevLines) => [...prevLines, { tool, points: [pos.x, pos.y], width, color }]);
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]); // Clear redo stack on new action
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing.current) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const lastLine = lines[lines.length - 1];

        const newPoints = lastLine.points.concat([point.x, point.y]);

        setLines((prevLines) => {
            const updatedLines = prevLines.slice(0, -1).concat({ ...lastLine, points: newPoints });
            return updatedLines;
        });
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

    const handleTouchStart = (e: any) => {
        e.evt.preventDefault(); // Prevent scrolling
        handleMouseDown(e);
    };

    const handleTouchMove = (e: any) => {
        e.evt.preventDefault(); // Prevent scrolling
        handleMouseMove(e);
    };

    const handleTouchEnd = () => {
        handleMouseUp();
    };

    const clearCanvas = () => {
        setLines([]);
        setUndoStack((prevStack) => [...prevStack, [...lines]]); // Store current state
        setRedoStack([]); // Clear redo stack
    };

    const undo = () => {
        if (undoStack.length > 0) {
            const lastState = undoStack.pop(); // Get the last state
            setRedoStack((prevRedo) => [...prevRedo, lines]); // Push current state to redo stack
            setLines(lastState || []); // Set the last state as current
            setUndoStack([...undoStack]); // Update the undo stack
        }
    };

    const redo = () => {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop(); // Get the next state
            setUndoStack((prevUndo) => [...prevUndo, lines]); // Push current state to undo stack
            setLines(nextState || []); // Set the next state as current
            setRedoStack([...redoStack]); // Update the redo stack
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="container-fluid p-0">
            <div className="row flex">
                <div className="col-12 position-relative">
                    <div className="position-absolute top-0 start-50 translate-middle-x m-3 z-50 d-flex flex-column flex-sm-row align-items-center bg-white shadow-lg rounded p-3">
                        <div className="d-flex flex-column flex-sm-row gap-2 mb-2 mb-sm-0">
                            {/* Color Palette */}
                            <div className="d-flex flex-row gap-1">
                                {colors.map((swatchColor) => (
                                    <div
                                        key={swatchColor}
                                        className={`w-8 h-8 cursor-pointer rounded-circle`}
                                        style={{ backgroundColor: swatchColor }}
                                        onClick={() => setColor(swatchColor)}
                                    >
                                        {color === swatchColor && (
                                            <div className="w-full h-full border border-white rounded-circle" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Tool Selector */}
                            <div className="d-flex flex-row gap-3">
                                <FaPen
                                    className={`text-4xl p-2 rounded-lg cursor-pointer ${tool === 'pen' ? 'border border-secondary' : ''}`}
                                    onClick={() => setTool('pen')}
                                />
                                <CiEraser
                                    className={`text-4xl p-2 rounded-lg cursor-pointer ${tool === 'eraser' ? 'border border-secondary' : ''}`}
                                    onClick={() => setTool('eraser')}
                                />
                            </div>

                            {/* Width Selector */}
                            <div className="d-flex flex-row gap-1">
                                {widths.map((w) => (
                                    <button
                                        key={w}
                                        className={`p-1 border rounded ${width === w ? 'bg-gray-300' : ''}`}
                                        onClick={() => setWidth(w)}
                                    >
                                        {w}px
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear, Undo, Redo Buttons */}
                        <div className="d-flex flex-row align-items-center">
                            <button
                                className="p-1 ml-3 text-2xl border rounded bg-danger text-white"
                                onClick={clearCanvas}
                            >
                                <MdDelete />
                            </button>
                            <button
                                className="p-1 ml-3 text-2xl border rounded bg-primary text-white"
                                onClick={undo}
                            >
                                <MdUndo />
                            </button>
                            <button
                                className="p-1 ml-3 text-2xl border rounded bg-primary text-white"
                                onClick={redo}
                            >
                                <MdRedo />
                            </button>
                        </div>
                    </div>

                    <div className="canvas-container">
                        <Stage
                            width={dimensions.width}
                            height={dimensions.height}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <Layer>
                                {lines.map((line, i) => (
                                    <Line
                                        key={i}
                                        points={line.points}
                                        stroke={line.color}
                                        strokeWidth={line.width}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                        globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                                    />
                                ))}
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
