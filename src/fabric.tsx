import { useState, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { FaPen } from 'react-icons/fa';
import { CiEraser } from 'react-icons/ci';
import { MdDelete, MdUndo, MdRedo, MdDownload } from "react-icons/md";
import "./App.css";
import { io } from 'socket.io-client';

type Color = string;
const colors: Color[] = ['red', 'blue', 'green', 'black', 'orange', 'yellow'];
const widths: number[] = [1, 5, 10, 15, 20];

interface LineData {
    tool: string;
    width: number;
    points: number[];
    color: string;
}

interface Cursor {
    x: number,
    y: number,
    id: string,
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
    const [cursorData, setCursorData] = useState<{ [key: string]: Cursor }>({});
    const stageref = useRef<any>(null);

    const socket = useMemo(() => io("http://localhost:1042"), []);

    useEffect(() => {
        const handleDrawing = (data: LineData) => {
            setLines((prev) => [...prev, data]);
        };

        const handleCanvasData = (canvasData: LineData[]) => {
            setLines(canvasData);
        };

        const handleCanvasCleared = () => {
            setLines([]);
        };

        const handleCursor = (data: Cursor) => {
            setCursorData((prevCursorData) => ({
                ...prevCursorData,
                [data.id]: { x: data.x, y: data.y, id: data.id, color: data.color },
            }));
        };

        socket.on('connect', () => {
            console.log('Connected to socket', socket.id);
        });

        socket.on("drawing", handleDrawing);
        socket.on("canvasData", handleCanvasData);
        socket.on("canvasCleared", handleCanvasCleared);
        socket.on("cursormove", handleCursor);

        return () => {
            socket.off("drawing", handleDrawing);
            socket.off("canvasData", handleCanvasData);
            socket.off("canvasCleared", handleCanvasCleared);
            socket.off("cursormove", handleCursor); // Clean up cursor event listener
        };
    }, [socket]);

    const handleMouseDown = (e: any) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setLines((prevLines) => [...prevLines, { tool, points: [pos.x, pos.y], width, color }]);
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]);
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

        socket.emit("drawing", { tool, points: newPoints, width, color });

        if (point) {
            socket.emit("cursormove", { x: point.x, y: point.y, id: socket.id, color }); // Emit cursor position and color
        }
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

    // Touch event handlers
    const handleTouchStart = (e: any) => {
        e.evt.preventDefault(); // Prevent default touch behavior
        handleMouseDown(e);
    };

    const handleTouchMove = (e: any) => {
        e.evt.preventDefault(); // Prevent default touch behavior
        handleMouseMove(e);
    };

    const handleTouchEnd = () => {
        handleMouseUp();
    };

    const clearCanvas = () => {
        setLines([]);
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]);
        socket.emit('clearCanvas');
    };

    const undo = () => {
        if (undoStack.length > 0) {
            const lastState = undoStack.pop();
            setRedoStack((prevRedo) => [...prevRedo, lines]);
            setLines(lastState || []);
            setUndoStack([...undoStack]);
        }
    };

    const redo = () => {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop();
            setUndoStack((prevUndo) => [...prevUndo, lines]);
            setLines(nextState || []);
            setRedoStack([...redoStack]);
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

    const handleDownload = () => {
        const uri = stageref.current.toDataURL();
        const link = document.createElement('a');
        link.href = uri;
        link.download = 'canvas-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container-fluid p-0">
            <div className="row flex">
                <div className="col-12 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle-x m-3 z-50 d-flex flex-column flex-md-row align-items-center bg-white shadow-lg rounded p-3">
    <div className="d-flex flex-row gap-2 flex-wrap">
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

    <div className="d-flex flex-row align-items-center mt-3 mt-md-0">
        <button
            className="p-1 ml-3 text-2xl border rounded"
            onClick={clearCanvas}
        >
            <MdDelete />
        </button>
        <button
            className="p-1 ml-3 text-2xl border rounded"
            onClick={undo}
        >
            <MdUndo />
        </button>
        <button
            className="p-1 ml-3 text-2xl border rounded"
            onClick={redo}
        >
            <MdRedo />
        </button>
        <button className="p-1 ml-3 text-2xl border rounded" onClick={handleDownload}>
            <MdDownload />
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
                            onTouchStart={handleTouchStart} // Touch start event
                            onTouchMove={handleTouchMove} // Touch move event
                            onTouchEnd={handleTouchEnd} // Touch end event
                            ref={stageref}
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
                            <Layer>
                                {Object.keys(cursorData).map((id) => {
                                    const cursor: Cursor = cursorData[id];
                                    return (
                                        <Line
                                            key={cursor.id}
                                            points={[cursor.x, cursor.y, cursor.x + 5, cursor.y]}
                                            stroke={cursor.color || 'black'}
                                            strokeWidth={10}
                                            lineCap="round"
                                        />
                                    );
                                })}
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
