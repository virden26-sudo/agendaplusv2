export const exportToJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-plus-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const importFromJSON = (onSuccess: (data: any) => void, onError: (error: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
            onError('No file selected.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const content = e.target?.result;
                if (typeof content === 'string') {
                    const data = JSON.parse(content);
                    if (data && typeof data === 'object') {
                        onSuccess(data);
                    } else {
                        onError('Invalid JSON file format.');
                    }
                }
            } catch (err) {
                onError('Failed to parse the JSON file.');
            }
        };

        reader.onerror = () => {
            onError('Failed to read the file.');
        };

        reader.readAsText(file);
    };

    input.click();
};

export const calculateGPA = (courses: { grade: number }[]): number => {
    if (courses.length === 0) return 0;
    
    const percentageToGPA = (percentage: number): number => {
        if (percentage >= 93) return 4.0;
        if (percentage >= 90) return 3.7;
        if (percentage >= 87) return 3.3;
        if (percentage >= 83) return 3.0;
        if (percentage >= 80) return 2.7;
        if (percentage >= 77) return 2.3;
        if (percentage >= 73) return 2.0;
        if (percentage >= 70) return 1.7;
        if (percentage >= 67) return 1.3;
        if (percentage >= 65) return 1.0;
        return 0.0;
    };

    const totalGPA = courses.reduce((acc, course) => acc + percentageToGPA(course.grade), 0);
    return Math.round((totalGPA / courses.length) * 100) / 100;
};

    