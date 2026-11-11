import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './button';

interface Props {
  visible: boolean;
  title: string;
  choices: { label: string; onPress: () => void; testID?: string }[];
  onClose: () => void;
}

/** A bottom sheet of two or three actions, for "what are you adding?" questions. */
export const ChoiceSheet = ({ visible, title, choices, onClose }: Props) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <Pressable accessibilityLabel="Close" className="flex-1 bg-black/40" onPress={onClose} />
    <SafeAreaView edges={['bottom']} className="rounded-t-2xl bg-white dark:bg-primary-900">
      <View className="gap-3 p-6">
        <Text className="text-lg font-semibold text-ink dark:text-white">{title}</Text>
        {choices.map((choice, index) => (
          <Button
            key={choice.label}
            label={choice.label}
            variant={index === 0 ? 'primary' : 'secondary'}
            onPress={choice.onPress}
            testID={choice.testID}
          />
        ))}
      </View>
    </SafeAreaView>
  </Modal>
);
