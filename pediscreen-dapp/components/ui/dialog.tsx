'use client';

import { Fragment, ReactNode } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <HeadlessDialog className="relative z-50" onClose={() => onOpenChange(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <HeadlessDialog.Panel className="mx-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              {children}
            </HeadlessDialog.Panel>
          </Transition.Child>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}

export function DialogContent({
  className = '',
  onClose,
  children,
}: {
  className?: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`max-h-[90vh] overflow-y-auto sm:max-w-4xl ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="border-b border-gray-200 p-6">{children}</div>;
}

export function DialogTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <HeadlessDialog.Title
      className={`text-2xl font-bold text-gray-900 ${className}`}
    >
      {children}
    </HeadlessDialog.Title>
  );
}
