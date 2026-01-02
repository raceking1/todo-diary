
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Mood, TodoItem, DailyData, AppState, ViewMode } from './types';
import { loadAllData, saveAllData, getStoredPassword, saveNewPassword, getInitialDailyData } from './utils/storage';
import {
  BookOpen, Moon, Sun, Search, Settings, Lock, Calendar, CheckSquare, FileText, GalleryHorizontal,
  Smile, Laugh, Meh, Frown, Angry, Camera, Plus, Trash2, RefreshCw, X, ChevronLeft, ChevronRight, ImageOff
} from './components/icons';

// --- UTILITY FUNCTIONS ---
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFormattedDateString = (date: Date): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${formatDateToYYYYMMDD(date)} (${days[date.getDay()]})`;
};

const compressImage = (file: File, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) return reject(new Error("Couldn't read file"));
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Couldn't get canvas context"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// --- SUB-COMPONENTS ---

const PhotoViewerModal: React.FC<{ photoSrc: string; onClose: () => void; }> = ({ photoSrc, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      isDragging.current = true;
      startPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      if (imgRef.current) imgRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (imgRef.current) imgRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current && scale > 1) {
      const newX = e.clientX - startPos.current.x;
      const newY = e.clientY - startPos.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.min(Math.max(0.5, scale + delta), 4);
      setScale(newScale);
      if(newScale <= 1) {
          setPosition({x: 0, y: 0});
      }
  };
  
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" 
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <button className="absolute top-4 right-4 text-white/80 p-2 z-10 hover:text-white transition-colors" onClick={onClose}>
        <X className="w-8 h-8"/>
      </button>
      <div 
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
      >
        <img
          ref={imgRef}
          src={photoSrc}
          alt="Full screen view"
          className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-200"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
            cursor: scale > 1 ? 'grab' : 'default',
            willChange: 'transform'
          }}
          onClick={e => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
};

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const storedPassword = getStoredPassword();

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === storedPassword) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 800);
      }
    }
  }, [pin, onUnlock, storedPassword]);

  const handleKeyClick = (key: string) => {
    if (pin.length < 4) setPin(pin + key);
  };
  const handleBackspace = () => setPin(pin.slice(0, -1));
  const handleReset = () => {
    if (window.confirm('모든 기록과 비밀번호가 초기화됩니다. 계속하시겠습니까?')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  const pinDots = Array(4).fill(0).map((_, i) => (
    <div key={i} className={`w-4 h-4 rounded-full transition-colors ${pin.length > i ? 'bg-accent dark:bg-accent-light' : 'bg-accent-light/50 dark:bg-dark-surface'} ${error ? '!bg-red-500' : ''}`}></div>
  ));

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (
    <div className="fixed inset-0 bg-background dark:bg-dark-bg z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent-light/50 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-accent-dark dark:text-dark-text">Soft Linen Diary</h1>
        <p className="text-text-main dark:text-text-light mt-2 mb-8">당신의 소중한 기록을 위해<br />비밀번호를 입력해주세요.</p>
        <div className="flex justify-center gap-4 mb-8">{pinDots}</div>
        <div className="grid grid-cols-3 gap-4">
          {numpadKeys.map(key => (
            <button key={key} onClick={() => handleKeyClick(key)} className="h-16 rounded-2xl bg-accent-light/30 dark:bg-dark-surface text-2xl font-bold text-accent-dark dark:text-dark-text hover:bg-accent-light/60 transition-colors">
              {key}
            </button>
          ))}
          <button onClick={handleReset} className="h-16 rounded-2xl bg-accent-light/30 dark:bg-dark-surface text-sm text-red-500 hover:bg-accent-light/60 transition-colors">초기화</button>
          <button onClick={() => handleKeyClick('0')} className="h-16 rounded-2xl bg-accent-light/30 dark:bg-dark-surface text-2xl font-bold text-accent-dark dark:text-dark-text hover:bg-accent-light/60 transition-colors">0</button>
          <button onClick={handleBackspace} className="h-16 rounded-2xl bg-accent-light/30 dark:bg-dark-surface text-accent-dark dark:text-dark-text hover:bg-accent-light/60 transition-colors flex justify-center items-center">
            <X className="w-6 h-6"/>
          </button>
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onLock: () => void;
}> = ({ isDarkMode, toggleDarkMode, onSearch, onSettings, onLock }) => (
    <header className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent"/>
            <h1 className="text-xl font-bold text-accent-dark dark:text-dark-text">Linen Diary</h1>
        </div>
        <div className="flex items-center gap-2">
            {[
                { icon: isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>, action: toggleDarkMode },
                { icon: <Search className="w-5 h-5"/>, action: onSearch },
                { icon: <Settings className="w-5 h-5"/>, action: onSettings },
            ].map((item, index) => (
                <button key={index} onClick={item.action} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-dark-surface shadow-sm text-accent-dark dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                    {item.icon}
                </button>
            ))}
             <button onClick={onLock} className="h-9 px-4 flex items-center justify-center rounded-full bg-white dark:bg-dark-surface shadow-sm text-accent-dark dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-600 transition text-sm font-semibold">
                잠금
            </button>
        </div>
    </header>
);

const DateNavigator: React.FC<{
  currentDate: Date;
  onDateChange: (newDate: Date) => void;
}> = ({ currentDate, onDateChange }) => {
    const changeDay = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + amount);
        onDateChange(newDate);
    };

    const handleDateChangeFromPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        // Fix for timezone issues where selecting a date might result in the previous day
        const selectedDate = new Date(e.target.value);
        const userTimezoneOffset = selectedDate.getTimezoneOffset() * 60000;
        const correctedDate = new Date(selectedDate.getTime() + userTimezoneOffset);
        onDateChange(correctedDate);
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between bg-white dark:bg-dark-surface p-2 rounded-xl shadow-sm">
                <button onClick={() => changeDay(-1)} className="p-2 text-accent-dark dark:text-dark-text rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><ChevronLeft/></button>
                <div className="flex items-center gap-2 text-sm font-bold text-text-main dark:text-dark-text whitespace-nowrap">
                   {getFormattedDateString(currentDate)}
                    <label htmlFor="date-picker-input" className="p-1 text-accent-dark dark:text-dark-text rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                        <Calendar className="w-5 h-5"/>
                    </label>
                    <input 
                        id="date-picker-input"
                        type="date"
                        value={formatDateToYYYYMMDD(currentDate)}
                        onChange={handleDateChangeFromPicker}
                        className="opacity-0 w-0 h-0 absolute"
                    />
                </div>
                <button onClick={() => onDateChange(new Date())} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-accent-light/30 dark:bg-gray-600 text-accent-dark dark:text-dark-text hover:bg-accent-light/50 transition">오늘</button>
                <button onClick={() => changeDay(1)} className="p-2 text-accent-dark dark:text-dark-text rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><ChevronRight/></button>
            </div>
        </div>
    );
};

const ViewTabs: React.FC<{
  viewMode: ViewMode;
  onViewChange: (view: ViewMode) => void;
}> = ({ viewMode, onViewChange }) => {
    const tabs: {id: ViewMode, label: string, icon: React.ReactNode}[] = [
        { id: 'todo', label: '할 일', icon: <CheckSquare className="w-5 h-5"/> },
        { id: 'diary', label: '일기', icon: <FileText className="w-5 h-5"/> },
        { id: 'gallery', label: '갤러리', icon: <GalleryHorizontal className="w-5 h-5"/> },
    ];
    return (
        <div className="px-4">
            <div className="grid grid-cols-3 gap-2 bg-accent-light/30 dark:bg-dark-surface p-2 rounded-xl">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onViewChange(tab.id)}
                    className={`flex items-center justify-center gap-2 py-2 text-sm rounded-lg font-semibold transition-colors ${
                        viewMode === tab.id
                        ? 'bg-accent text-white shadow'
                        : 'text-accent-dark dark:text-dark-text hover:bg-accent-light/50'
                    }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
            </div>
        </div>
    );
};

const TodoView: React.FC<{
  todos: TodoItem[];
  onUpdate: (todos: TodoItem[]) => void;
  onRepeat: (todo: TodoItem) => void;
}> = ({ todos, onUpdate, onRepeat }) => {
    const [newTodoText, setNewTodoText] = useState('');

    const handleAdd = () => {
        if (!newTodoText.trim()) return;
        const newTodo: TodoItem = { id: Date.now().toString(), text: newTodoText, completed: false };
        onUpdate([...todos, newTodo]);
        setNewTodoText('');
    };

    const handleToggle = (id: string) => {
        const updatedTodos = todos.map(todo => {
            if (todo.id === id) {
                const updatedTodo = { ...todo, completed: !todo.completed };
                if (updatedTodo.completed && updatedTodo.repeatDays) {
                    onRepeat(updatedTodo);
                }
                return updatedTodo;
            }
            return todo;
        });
        onUpdate(updatedTodos);
    };

    const handleDelete = (id: string) => {
        onUpdate(todos.filter(todo => todo.id !== id));
    };
    
    const handleRepeatChange = (id: string, days: number) => {
        onUpdate(todos.map(todo => todo.id === id ? {...todo, repeatDays: days > 0 ? days : undefined} : todo));
    };

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm">
                <h2 className="flex items-center gap-2 font-bold text-sm text-text-main dark:text-dark-text mb-4">
                    <CheckSquare className="text-accent"/> 투두 리스트
                </h2>
                <div className="space-y-3">
                    {todos.map(todo => (
                        <div key={todo.id} className="flex items-center gap-3 p-2 rounded-lg bg-background dark:bg-dark-bg">
                            <input type="checkbox" checked={todo.completed} onChange={() => handleToggle(todo.id)} className="w-5 h-5 accent-accent" />
                            <span className={`flex-1 text-sm text-text-main dark:text-dark-text ${todo.completed ? 'line-through text-text-light' : ''}`}>{todo.text}</span>
                            <div className="flex items-center gap-1 text-sm">
                                <input type="number" min="0" value={todo.repeatDays || 0} onChange={e => handleRepeatChange(todo.id, parseInt(e.target.value, 10))} className="w-12 text-center bg-transparent border-b border-gray-300 dark:border-gray-500 text-text-main dark:text-dark-text" />
                                <span className="text-text-light">일 뒤</span>
                                <button onClick={() => onRepeat(todo)} className="p-1 text-text-light hover:text-accent"><RefreshCw className="w-4 h-4"/></button>
                            </div>
                            <button onClick={() => handleDelete(todo.id)} className="p-1 text-text-light hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-4">
                    <input 
                        type="text" 
                        value={newTodoText}
                        onChange={e => setNewTodoText(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAdd()}
                        placeholder="할 일을 입력하세요"
                        className="flex-1 px-4 py-2 border-none bg-background dark:bg-dark-bg rounded-lg focus:ring-2 focus:ring-accent text-sm text-text-main dark:text-dark-text"
                    />
                    <button onClick={handleAdd} className="w-10 h-10 flex items-center justify-center bg-accent text-white rounded-lg hover:bg-accent-dark transition">
                        <Plus className="w-6 h-6"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

const DiaryView: React.FC<{
  dailyData: DailyData;
  onUpdate: (data: Partial<DailyData>) => void;
  onCameraOpen: () => void;
  onPhotoSelect: (photoSrc: string) => void;
}> = ({ dailyData, onUpdate, onCameraOpen, onPhotoSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const moods: {id: Mood, label: string, icon: React.ReactNode}[] = [
        { id: 'happy', label: '행복', icon: <Smile/> },
        { id: 'excited', label: '기대', icon: <Laugh/> },
        { id: 'neutral', label: '평온', icon: <Meh/> },
        { id: 'sad', label: '슬픔', icon: <Frown/> },
        { id: 'angry', label: '화남', icon: <Angry/> },
    ];

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const files = Array.from(event.target.files);
        const compressedPhotos = await Promise.all(files.map(file => compressImage(file)));
        onUpdate({ photos: [...(dailyData.photos || []), ...compressedPhotos] });
    };

    const removePhoto = (index: number) => {
        onUpdate({ photos: dailyData.photos.filter((_, i) => i !== index) });
    };

    const photoCount = dailyData.photos.length;
    const photoGridClass =
        photoCount === 1 ? 'grid-cols-1' :
        photoCount === 2 ? 'grid-cols-2' :
        'grid-cols-3';

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm space-y-4">
                <div>
                    <h2 className="flex items-center gap-2 font-bold text-sm text-text-main dark:text-dark-text mb-2"><Smile className="text-accent"/> 오늘의 기분</h2>
                    <div className="flex justify-around p-2 bg-background dark:bg-dark-bg rounded-lg">
                        {moods.map(m => (
                            <button key={m.id} onClick={() => onUpdate({ mood: m.id })} className={`flex flex-col items-center gap-1 p-2 rounded-lg w-16 transition-colors ${dailyData.mood === m.id ? 'bg-accent-light dark:bg-accent-dark' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                <div className={`w-8 h-8 ${dailyData.mood === m.id ? 'text-accent-dark dark:text-dark-text' : 'text-text-light'}`}>{m.icon}</div>
                                <span className={`text-xs font-semibold ${dailyData.mood === m.id ? 'text-accent-dark dark:text-dark-text' : 'text-text-light'}`}>{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="flex items-center gap-2 font-bold text-sm text-text-main dark:text-dark-text"><Camera className="text-accent"/> 오늘의 기록 ({photoCount}장)</h2>
                        <div className="flex gap-2">
                            <button onClick={onCameraOpen} className="px-3 py-1.5 text-sm font-semibold bg-accent-light/50 dark:bg-gray-600 text-accent-dark dark:text-dark-text rounded-md hover:bg-accent-light/80 transition">카메라 촬영</button>
                            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm font-semibold bg-accent-light/50 dark:bg-gray-600 text-accent-dark dark:text-dark-text rounded-md hover:bg-accent-light/80 transition">사진 추가</button>
                            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} multiple accept="image/*" className="hidden"/>
                        </div>
                    </div>
                    <div className={`grid ${photoGridClass} gap-2 p-2 bg-background dark:bg-dark-bg rounded-lg min-h-[120px]`}>
                        {photoCount > 0 ? dailyData.photos.map((photo, index) => (
                             <div key={index} className={`relative group cursor-pointer ${photoCount === 1 ? 'aspect-video' : 'aspect-square'}`} onClick={() => onPhotoSelect(photo)}>
                                <img src={photo} alt={`diary-${index}`} className="w-full h-full object-cover rounded-md" />
                                <button onClick={(e) => { e.stopPropagation(); removePhoto(index); }} className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4"/></button>
                             </div>
                        )) : (
                           <div className="col-span-full flex flex-col items-center justify-center text-text-light py-8">
                                <ImageOff className="w-8 h-8 mb-2"/>
                                <p className="text-sm">사진을 추가하여 오늘을 기록하세요</p>
                           </div>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="flex items-center gap-2 font-bold text-sm text-text-main dark:text-dark-text mb-2"><FileText className="text-accent"/> 오늘의 일기</h2>
                    <textarea
                        value={dailyData.diary}
                        onChange={e => onUpdate({ diary: e.target.value })}
                        rows={8}
                        placeholder="오늘 하루는 어땠나요?"
                        className="w-full p-3 border-none bg-background dark:bg-dark-bg rounded-lg focus:ring-2 focus:ring-accent text-sm text-text-main dark:text-dark-text"
                    ></textarea>
                </div>
            </div>
        </div>
    );
};

const GalleryView: React.FC<{
  allData: AppState;
  onNavigate: (date: Date) => void;
}> = ({ allData, onNavigate }) => {
    const allPhotos = useMemo(() => {
        return Object.entries(allData)
            .flatMap(([date, data]) => 
                data.photos.map(photoSrc => ({ date, photoSrc }))
            )
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [allData]);

    return (
        <div className="p-4">
            <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm">
                <h2 className="flex items-center gap-2 font-bold text-sm text-text-main dark:text-dark-text mb-4">
                    <GalleryHorizontal className="text-accent"/> 추억 갤러리
                </h2>
                {allPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {allPhotos.map(({ date, photoSrc }, index) => (
                            <div key={`${date}-${index}`} className="relative aspect-square cursor-pointer group" onClick={() => {
                                const [year, month, day] = date.split('-').map(Number);
                                const newDate = new Date(year, month - 1, day);
                                onNavigate(newDate);
                            }}>
                                <img src={photoSrc} alt={`gallery-${date}-${index}`} className="w-full h-full object-cover rounded-md group-hover:opacity-80 transition-opacity" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    {date}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-text-light py-16">
                        <ImageOff className="w-12 h-12 mb-4"/>
                        <p>사진 기록이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const CameraView: React.FC<{
    onCapture: (photo: string) => void;
    onClose: () => void;
}> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const startCamera = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("카메라에 접근할 수 없습니다. 권한을 확인해주세요.");
            onClose();
        }
    }, [facingMode, onClose]);

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if(context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                onCapture(dataUrl);
            }
        }
    };
    
    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 flex justify-around items-center">
                <button onClick={onClose} className="text-white text-lg">취소</button>
                <button onClick={handleCapture} className="w-20 h-20 rounded-full border-4 border-white bg-white/30"></button>
                <button onClick={switchCamera} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/30">
                    <RefreshCw className="w-6 h-6 text-white"/>
                </button>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{
  onClose: () => void;
  onPasswordChange: (newPin: string) => void;
  allData: AppState;
}> = ({ onClose, onPasswordChange, allData }) => {
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const handleBackup = () => {
        const dataStr = JSON.stringify(allData);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `linen-diary-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!window.confirm("현재 모든 데이터를 덮어쓰고 복원합니다. 계속하시겠습니까?")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if(typeof result === 'string') {
                    const parsedData = JSON.parse(result);
                    // simple validation
                    if (typeof parsedData === 'object' && parsedData !== null) {
                         saveAllData(parsedData);
                         alert('복원이 완료되었습니다. 앱을 새로고침합니다.');
                         window.location.reload();
                    } else {
                        throw new Error("Invalid data format");
                    }
                }
            } catch (error) {
                alert("잘못된 파일 형식입니다.");
            }
        };
        reader.readAsText(file);
    };

    const handlePinSave = () => {
        if (newPin.length !== 4) {
            alert("비밀번호는 4자리여야 합니다.");
            return;
        }
        if (newPin !== confirmPin) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }
        onPasswordChange(newPin);
        alert("비밀번호가 변경되었습니다.");
        setNewPin('');
        setConfirmPin('');
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-lg p-6 space-y-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-main dark:text-dark-text">설정</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><X /></button>
                </div>
                
                <div className="space-y-2">
                    <h3 className="font-semibold text-text-main dark:text-dark-text">비밀번호 변경</h3>
                    <input type="password" value={newPin} onChange={e => setNewPin(e.target.value.slice(0,4))} placeholder="새 비밀번호 4자리" className="w-full p-2 bg-background dark:bg-dark-bg rounded-md"/>
                    <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value.slice(0,4))} placeholder="비밀번호 확인" className="w-full p-2 bg-background dark:bg-dark-bg rounded-md"/>
                    <button onClick={handlePinSave} className="w-full py-2 bg-accent text-white rounded-md font-semibold hover:bg-accent-dark">저장</button>
                </div>

                <div className="space-y-2">
                    <h3 className="font-semibold text-text-main dark:text-dark-text">데이터 관리</h3>
                    <div className="flex gap-2">
                        <button onClick={handleBackup} className="flex-1 py-2 bg-accent-light/50 dark:bg-gray-600 text-accent-dark dark:text-dark-text rounded-md font-semibold hover:bg-accent-light/80">데이터 백업</button>
                        <label className="flex-1 py-2 text-center bg-accent-light/50 dark:bg-gray-600 text-accent-dark dark:text-dark-text rounded-md font-semibold hover:bg-accent-light/80 cursor-pointer">
                            데이터 복원
                            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};


const SearchModal: React.FC<{
  onClose: () => void;
  allData: AppState;
  onNavigate: (date: Date) => void;
}> = ({ onClose, allData, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowerCaseTerm = searchTerm.toLowerCase();
        return Object.entries(allData)
            .map(([date, data]) => {
                const diaryMatch = data.diary.toLowerCase().includes(lowerCaseTerm);
                const todoMatch = data.todo.some(t => t.text.toLowerCase().includes(lowerCaseTerm));
                if (diaryMatch || todoMatch) {
                    return { date, data };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => b!.date.localeCompare(a!.date)); // Sort descending
    }, [searchTerm, allData]);

    return (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface w-full max-w-md h-3/4 flex flex-col rounded-2xl shadow-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-text-main dark:text-dark-text">기록 검색</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><X /></button>
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="일기나 할 일 내용 검색..."
                    className="w-full p-3 bg-background dark:bg-dark-bg rounded-md mb-4 focus:ring-2 focus:ring-accent"
                    autoFocus
                />
                <div className="flex-1 overflow-y-auto space-y-2">
                    {searchResults.map(result => result && (
                        <div key={result.date} onClick={() => {
                            const [year, month, day] = result.date.split('-').map(Number);
                            const newDate = new Date(year, month - 1, day);
                            onNavigate(newDate);
                        }} className="p-3 bg-background dark:bg-dark-bg rounded-md cursor-pointer hover:bg-accent-light/30">
                            <p className="font-bold text-accent-dark dark:text-dark-text">{result.date}</p>
                            {result.data.diary.toLowerCase().includes(searchTerm.toLowerCase()) && <p className="text-sm text-text-main dark:text-text-light truncate">일기: {result.data.diary}</p>}
                            {result.data.todo.filter(t=>t.text.toLowerCase().includes(searchTerm.toLowerCase())).map(t=>(
                                <p key={t.id} className="text-sm text-text-main dark:text-text-light truncate">할 일: {t.text}</p>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allData, setAllData] = useState<AppState>({});
  const [viewMode, setViewMode] = useState<ViewMode>('diary');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    setAllData(loadAllData());
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && prefersDark)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
        const newMode = !prev;
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        return newMode;
    });
  };

  const currentDateKey = formatDateToYYYYMMDD(currentDate);
  const currentDailyData = useMemo(() => allData[currentDateKey] || getInitialDailyData(), [allData, currentDateKey]);

  const updateDailyData = useCallback((data: Partial<DailyData>) => {
    const updatedData = { ...currentDailyData, ...data };
    const newAllData = { ...allData, [currentDateKey]: updatedData };
    setAllData(newAllData);
    saveAllData(newAllData);
  }, [allData, currentDailyData, currentDateKey]);

  const handleTodoRepeat = (todo: TodoItem) => {
    const repeatDays = todo.repeatDays || 0;
    if (repeatDays <= 0) return;
    
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + repeatDays);
    const nextDateKey = formatDateToYYYYMMDD(nextDate);
    
    const nextDayData = allData[nextDateKey] || getInitialDailyData();
    const newTodo: TodoItem = { ...todo, id: Date.now().toString(), completed: false };
    
    const newNextDayTodos = [...nextDayData.todo, newTodo];
    
    setAllData(prevData => {
        const updatedAllData = {
            ...prevData,
            [nextDateKey]: { ...nextDayData, todo: newNextDayTodos }
        };
        saveAllData(updatedAllData);
        return updatedAllData;
    });
  };
  
  const handlePasswordChange = (newPin: string) => {
    saveNewPassword(newPin);
  };
  
  const handleNavigateToDate = (date: Date) => {
    setCurrentDate(date);
    setShowSearch(false);
  };

  const handleNavigateAndSwitchView = (date: Date) => {
    setCurrentDate(date);
    setViewMode('diary');
  };
  
  const handleCapturePhoto = (photo: string) => {
    updateDailyData({ photos: [...currentDailyData.photos, photo] });
    setShowCamera(false);
  };

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }
  
  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
        <Header 
            isDarkMode={isDarkMode} 
            toggleDarkMode={toggleDarkMode}
            onSearch={() => setShowSearch(true)}
            onSettings={() => setShowSettings(true)}
            onLock={() => setIsLocked(true)}
        />
        <main className="flex-1">
            <DateNavigator currentDate={currentDate} onDateChange={setCurrentDate} />
            <ViewTabs viewMode={viewMode} onViewChange={setViewMode} />
            
            {viewMode === 'todo' && <TodoView todos={currentDailyData.todo} onUpdate={(todos) => updateDailyData({ todo: todos })} onRepeat={handleTodoRepeat}/>}
            {viewMode === 'diary' && <DiaryView dailyData={currentDailyData} onUpdate={updateDailyData} onCameraOpen={() => setShowCamera(true)} onPhotoSelect={setSelectedPhoto}/>}
            {viewMode === 'gallery' && <GalleryView allData={allData} onNavigate={handleNavigateAndSwitchView} />}
        </main>
        <footer className="text-center p-4 text-sm text-text-light">
            © {new Date().getFullYear()} Soft Linen Diary. All records are stored locally.
        </footer>

        {showCamera && <CameraView onCapture={handleCapturePhoto} onClose={() => setShowCamera(false)} />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onPasswordChange={handlePasswordChange} allData={allData}/>}
        {showSearch && <SearchModal onClose={() => setShowSearch(false)} allData={allData} onNavigate={handleNavigateToDate}/>}
        {selectedPhoto && <PhotoViewerModal photoSrc={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
    </div>
  );
}
