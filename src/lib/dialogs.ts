export type DialogOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

export type DialogState = DialogOptions & {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  onConfirm: () => void;
  onCancel: () => void;
};

let listeners: ((state: DialogState) => void)[] = [];

export const dialogStore = {
  state: {
    isOpen: false,
    type: 'alert',
    message: '',
    title: '',
    confirmText: 'OK',
    cancelText: 'Cancelar',
    onConfirm: () => {},
    onCancel: () => {}
  } as DialogState,

  subscribe(listener: (state: DialogState) => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  notify() {
    listeners.forEach(l => l(this.state));
  }
};

export const customAlert = (message: string, title: string = 'Aviso') => {
  return new Promise<void>((resolve) => {
    dialogStore.state = {
      isOpen: true,
      type: 'alert',
      message,
      title,
      confirmText: 'OK',
      onConfirm: () => {
        dialogStore.state = { ...dialogStore.state, isOpen: false };
        dialogStore.notify();
        resolve();
      },
      onCancel: () => {
        dialogStore.state = { ...dialogStore.state, isOpen: false };
        dialogStore.notify();
        resolve();
      }
    };
    dialogStore.notify();
  });
};

export const customConfirm = (message: string, title: string = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar') => {
  return new Promise<boolean>((resolve) => {
    dialogStore.state = {
      isOpen: true,
      type: 'confirm',
      message,
      title,
      confirmText,
      cancelText,
      onConfirm: () => {
        dialogStore.state = { ...dialogStore.state, isOpen: false };
        dialogStore.notify();
        resolve(true);
      },
      onCancel: () => {
        dialogStore.state = { ...dialogStore.state, isOpen: false };
        dialogStore.notify();
        resolve(false);
      }
    };
    dialogStore.notify();
  });
};
