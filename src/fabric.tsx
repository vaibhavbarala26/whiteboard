import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { FaPen } from 'react-icons/fa';
import { CiEraser } from 'react-icons/ci';
import { MdDelete, MdUndo, MdRedo, MdDownload } from "react-icons/md";
import "./App.css";
import { useSocket } from './Hooks/UseSocket';
import Invitebyemail from './component/Invitebyemail';
import { FaRegWindowClose } from "react-icons/fa";
import Chat from './component/Chat';
import useKeycloakAuth from './Hooks/UseKeycloakAuth';

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
    const [opentool, setOpentool] = useState<boolean>(false);
    const [color, setColor] = useState<string>('black');
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [cursorData, setCursorData] = useState<{ [key: string]: Cursor }>({});
    const stageref = useRef<any>(null);

    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

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
                [data.id]: data,
            }));
        };

        socket.on("drawing", handleDrawing);
        socket.on("canvasData", handleCanvasData);
        socket.on("canvasCleared", handleCanvasCleared);
        socket.on("cursormove", handleCursor);

        return () => {
            socket.off("drawing", handleDrawing);
            socket.off("canvasData", handleCanvasData);
            socket.off("canvasCleared", handleCanvasCleared);
            socket.off("cursormove", handleCursor);
        };
    }, [socket]);

    const handleMouseDown = (e: any) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        const newLine = { tool, points: [pos.x, pos.y], width, color };
        
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]);
        setLines((prevLines) => [...prevLines, newLine]);
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing.current) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const lastLine = lines[lines.length - 1];

        if (lastLine) {
            const newPoints = lastLine.points.concat([point.x, point.y]);
            const updatedLines = [...lines.slice(0, -1), { ...lastLine, points: newPoints }];
            setLines(updatedLines);

            if (socket) {
                socket.emit("drawing", { tool, points: newPoints, width, color });
                socket.emit("cursormove", { x: point.x, y: point.y, id: socket.id, color });
            }
        }
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

    const handleTouchStart = (e: any) => {
        e.evt.preventDefault();
        handleMouseDown(e);
    };

    const handleTouchMove = (e: any) => {
        e.evt.preventDefault();
        handleMouseMove(e);
    };

    const handleTouchEnd = () => {
        handleMouseUp();
    };

    const clearCanvas = () => {
        setLines([]);
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]);
        if (socket) {
            socket.emit('clearCanvas');
        }
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

    const { keycloak, isAuthenticated, handleLogin, handleLogout } = useKeycloakAuth();

    return (
        <div className="container-fluid p-0">
            <div className="row flex">
                <div className="col-12 position-relative flex flex-column md:flex-row">
                    <div className="flex flex-row align-items-center mb-2 gap-2">
                        {/* Open Tool Button */}
                        {!opentool ? (
                            <div className=' cursor-pointer shadow-lg h-20 w-20 rounded-full flex justify-center items-center  font-bold text-sm' onClick={() => setOpentool(true)}>
                                Open Tool
                            </div>
                        ) : null}
                        {/* Invite by Email Component */}
                        <div>
                        <Invitebyemail isAuthenticated={isAuthenticated} handleLogin={handleLogin} handleLogout={handleLogout} />
                        </div>
                        <div>
                        <Chat keycloak={keycloak} />
                        </div>
                    </div>

                    {opentool && (
                        <div className="position-absolute top-0 start-50 translate-middle-x m-3 z-50 d-flex flex-column flex-md-row align-items-center bg-white shadow-lg rounded p-3">
                            {/* Color Swatches */}
                            <div className="d-flex flex-md-row flex-row gap-2">
                                {colors.map((swatchColor) => (
                                    <div
                                        key={swatchColor}
                                        className={`w-8 h-8 cursor-pointer rounded-circle border border-light`}
                                        style={{ backgroundColor: swatchColor }}
                                        onClick={() => setColor(swatchColor)}
                                    >
                                        {color === swatchColor && (
                                            <div className="w-full h-full border border-white rounded-circle" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Tool Selection */}
                            <div className="d-flex flex-row gap-3 mt-2 mt-md-0">
                                <FaPen
                                    className={`text-4xl p-2 rounded-lg cursor-pointer ${tool === 'pen' ? 'border border-secondary' : ''}`}
                                    onClick={() => setTool('pen')}
                                />
                                <CiEraser
                                    className={`text-4xl p-2 rounded-lg cursor-pointer ${tool === 'eraser' ? 'border border-secondary' : ''}`}
                                    onClick={() => setTool('eraser')}
                                />
                            </div>

                            {/* Width Selection */}
                            <div className="d-flex flex-row gap-1 mt-2 mt-md-0">
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

                            {/* Action Buttons */}
                            <div className="d-flex flex-row align-items-center mt-3 mt-md-0">
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={clearCanvas}>
                                    <MdDelete />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={undo}>
                                    <MdUndo />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={redo}>
                                    <MdRedo />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={handleDownload}>
                                    <MdDownload />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={() => setOpentool(false)}>
                                    <FaRegWindowClose />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="canvas-container h-full max-w-full">
                        <Stage
                            width={dimensions.width}
                            height={dimensions.height}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
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
